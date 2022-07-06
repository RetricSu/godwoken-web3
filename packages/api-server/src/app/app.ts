import createError from "http-errors";
import express, { Express } from "express";
import { jaysonMiddleware } from "../middlewares/jayson";
import cors from "cors";
import { wrapper } from "../ws/methods";
import expressWs from "express-ws";
import Sentry from "@sentry/node";
import { applyRateLimitByIp } from "../rate-limit";
import { initSentry } from "../sentry";
import { envConfig } from "../base/env-config";
import { gwConfig } from "../base/index";
import { expressLogger, logger } from "../base/logger";
import { Server } from "http";

const BODY_PARSER_LIMIT = "100mb";

let server: Server | undefined;

export function addSentry(app: Express) {
  const sentryOptionRequest = [
    "cookies",
    "data",
    "headers",
    "method",
    "query_string",
    "url",
    "body",
  ];
  initSentry();

  // The request handler must be the first middleware on the app
  app.use(
    Sentry.Handlers.requestHandler({
      request: sentryOptionRequest,
    })
  );
}

export function addNewRelic(app: Express, newrelic: any) {
  app.use(
    (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) => {
      // set new relic name
      const transactionName = `${req.method} ${req.url}#${req.body.method}`;
      logger.debug("#transactionName:", transactionName);
      newrelic.setTransactionName(transactionName);

      next();
    }
  );
}

// must be first middleware
export function addLogger(app: Express) {
  app.use(
    async (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) => {
      // log request method / body
      if (envConfig.logRequestBody) {
        logger.debug("request.body:", req.body);
      }

      next();
    }
  );

  app.use(expressLogger);
}

export function addJson(app: Express) {
  app.use(express.json({ limit: BODY_PARSER_LIMIT }));
  app.use("/", jaysonMiddleware);
}

export function addCors(app: Express) {
  const corsOptions: cors.CorsOptions = {
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true,
  };
  app.use(cors(corsOptions));
}

export function addUrlEncode(app: Express) {
  app.use(express.urlencoded({ extended: false, limit: BODY_PARSER_LIMIT }));
}

export function addRateLimit(app: Express) {
  app.use(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      // restrict access rate limit via ip
      await applyRateLimitByIp(req, res, next);
    }
  );
}

export function addWs(app: Express) {
  expressWs(app);
  (app as any).ws("/ws", wrapper);
}

export function addErrorHandler(app: Express) {
  if (envConfig.sentryDns) {
    // The error handler must be before any other error middleware and after all controllers
    app.use(
      Sentry.Handlers.errorHandler({
        // request: sentryOptionRequest,
      })
    );
  }

  // catch 404 and forward to error handler
  app.use(
    (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) => {
      next(createError(404));
    }
  );

  // error handler
  app.use(function (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    logger.error(err.stack);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    logger.error("err.status:", err.status);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500);
    res.render("error");
  });
}

export enum Middleware {
  json,
  cors,
  urlEncode,
  logger,
  rateLimit,
  ws,
  errorHandler,
}

function getAllMiddleware() {
  return [
    Middleware.json,
    Middleware.cors,
    Middleware.urlEncode,
    Middleware.logger,
    Middleware.rateLimit,
    Middleware.ws,
    Middleware.errorHandler,
  ];
}

export async function startServer(
  port: number,
  midList: Middleware[] = getAllMiddleware()
): Promise<void> {
  const app: Express = express();

  /* MiddleWares */
  /*** monitor ***/
  if (envConfig.newRelicLicenseKey) {
    logger.info("new relic init !!!");
    const newrelic = require("newrelic");
    addNewRelic(app, newrelic);
  }
  if (envConfig.sentryDns) {
    addSentry(app);
  }
  /*** features ***/
  midList.includes(Middleware.logger) ? addLogger(app) : "";
  midList.includes(Middleware.cors) ? addCors(app) : "";
  midList.includes(Middleware.urlEncode) ? addUrlEncode(app) : "";
  midList.includes(Middleware.json)
    ? addJson(app)
    : app.use("/", (_req, res) => res.send("ok"));
  midList.includes(Middleware.rateLimit) ? addRateLimit(app) : "";
  midList.includes(Middleware.ws) ? addWs(app) : "";
  midList.includes(Middleware.errorHandler) ? addErrorHandler(app) : "";

  // run
  try {
    await gwConfig.init();
    logger.info("godwoken config initialized!");
  } catch (err) {
    logger.error("godwoken config initialize failed:", err);
    process.exit(1);
  }
  server = app.listen(port, () => {
    const addr = (server as Server).address();
    const bind =
      typeof addr === "string" ? "pipe " + addr : "port " + addr!.port;
    logger.info("godwoken-web3-api:server Listening on " + bind);
  });
}

export function isListening() {
  if (server == null) {
    return false;
  }
  return server.listening;
}
