/**
 * Module dependencies.
 */

import { Middleware } from "./app";
import { main } from "./cluster";
main(true, [
  Middleware.json,
  Middleware.cors,
  Middleware.errorHandler,
  Middleware.rateLimit,
  Middleware.urlEncode,
  Middleware.ws,
]);
