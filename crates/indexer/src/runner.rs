use std::time::Duration;

use gw_web3_rpc_client::{convertion::to_l2_block, godwoken_rpc_client::GodwokenRpcClient};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions, PgPool,
};

use crate::{config::IndexerConfig, Web3Indexer};
use anyhow::{anyhow, Result};

pub struct Runner {
    indexer: Web3Indexer,
    pg_pool: PgPool,
    local_tip: Option<u64>,
    godwoken_rpc_client: GodwokenRpcClient,
}

impl Runner {
    pub fn new(config: IndexerConfig) -> Result<Runner> {
        let pg_pool = {
            let init_pool = {
                smol::block_on(async {
                    let mut opts: PgConnectOptions = config.pg_url.parse()?;
                    opts.log_statements(log::LevelFilter::Debug)
                        .log_slow_statements(log::LevelFilter::Warn, Duration::from_secs(5));
                    PgPoolOptions::new()
                        .max_connections(5)
                        .connect_with(opts)
                        .await
                })
            };
            init_pool?
        };
        let indexer = Web3Indexer::new(
            pg_pool.clone(),
            config.l2_sudt_type_script_hash,
            config.polyjuice_type_script_hash,
            config.rollup_type_hash,
            config.eth_account_lock_hash,
            config.tron_account_lock_hash,
            config.godwoken_rpc_url.as_str(),
        );
        let godwoken_rpc_client = GodwokenRpcClient::new(config.godwoken_rpc_url.as_str());
        let runner = Runner {
            indexer,
            local_tip: None,
            pg_pool,
            godwoken_rpc_client,
        };
        Ok(runner)
    }

    // None means no local blocks
    pub async fn tip(&self) -> Result<Option<u64>> {
        let tip = match self.local_tip {
            Some(t) => Some(t),
            None => {
                let row: Option<(Decimal,)> =
                    sqlx::query_as("select number from blocks order by number desc limit 1;")
                        .fetch_optional(&self.pg_pool)
                        .await?;

                row.and_then(|(n,)| n.to_u64())
            }
        };
        Ok(tip)
    }

    pub async fn update_tip(&mut self, tip_number: u64) -> Result<()> {
        self.local_tip = Some(tip_number);

        Ok(())
    }

    pub fn bump_tip(&mut self) -> Result<()> {
        match self.local_tip {
            None => {
                self.local_tip = Some(0);
            }
            Some(t) => {
                self.local_tip = Some(t + 1);
            }
        }

        Ok(())
    }

    pub async fn insert(&mut self) -> Result<bool> {
        let local_tip = self.tip().await?;
        let current_block_number = match local_tip {
            None => 0,
            Some(t) => t + 1,
        };
        let current_block = self
            .godwoken_rpc_client
            .get_block_by_number(current_block_number)
            .map_err(|e| anyhow!("block #{} error! {}", current_block_number, e))?;

        if let Some(b) = current_block {
            let l2_block = to_l2_block(b);
            self.indexer.store_l2_block(l2_block).await?;
            log::info!("Sync block {}", current_block_number);
            self.bump_tip()?;
            return Ok(true);
        }

        Ok(false)
    }

    pub async fn run(&mut self) -> Result<()> {
        loop {
            let result = self.insert().await?;

            if !result {
                let sleep_time = std::time::Duration::from_secs(3);
                std::thread::sleep(sleep_time);
            }
        }
    }
}
