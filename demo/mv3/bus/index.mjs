var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/index.ts
function getHandler(input, path = "") {
  const segments = path.split("/");
  let parent = input;
  while (segments.length > 0) {
    const segment = segments.shift();
    if (segment) {
      const child = parent[segment];
      if (typeof child === "function") {
        if (segments.length === 0) {
          return child.bind(parent);
        }
      } else {
        parent = child;
      }
    }
  }
  return;
}
function makeRequest(source, target, path, data) {
  const [_target, _path] = path.includes(":") ? path.split(":") : [void 0, path];
  return {
    source,
    target: _target || target,
    path: _path,
    data
  };
}
function makeResponse(target, payload) {
  return __spreadValues({ target }, payload);
}
var makeBus = (source, options = {}) => {
  const handleRequest = (request, sender, sendResponse) => {
    const { target: target2, path, data } = request || {};
    if (target2 === source || target2 === "*") {
      const handler = getHandler(handlers, path);
      const send = (data2) => {
        sendResponse(makeResponse(source, data2));
      };
      if (handler && typeof handler === "function") {
        const handleError = (error) => {
          const data2 = error instanceof Error ? { message: error.message, type: error.name } : { message: error };
          send({
            error: __spreadValues({ code: "handler_error" }, data2)
          });
          console.warn(error);
        };
        try {
          const result = handler(data, sender);
          if (result instanceof Promise) {
            result.then((result2) => send({ result: result2 })).catch(handleError);
            return true;
          }
          send({ result });
        } catch (error) {
          handleError(error);
        }
      }
      if (target2 === source) {
        return send({ error: { code: "no_handler", message: `No handler` } });
      }
    }
  };
  const handleExternalRequest = (request, sender, sendResponse) => {
    if (request && typeof request === "object" && "path" in request) {
      const path = request.path;
      const external = options.external;
      if (typeof path === "string") {
        if (Array.isArray(external)) {
          if (!external.some((p) => {
            const rx = new RegExp(`^${p.replace(/\*/g, ".+?")}$`);
            return rx.test(path);
          })) {
            return sendResponse();
          }
        }
        if (typeof external === "function") {
          if (!external(path, sender)) {
            return sendResponse();
          }
        }
        return handleRequest(__spreadValues({ source: "external", target: "*" }, request), sender, sendResponse);
      }
    }
  };
  const handleResponse = function(response, request, resolve, reject) {
    var _a, _b, _c, _d, _e, _f;
    const chromeError = ((_a = chrome.runtime.lastError) == null ? void 0 : _a.message) || "";
    if (chromeError || !response || response.error) {
      const code = ((_b = response == null ? void 0 : response.error) == null ? void 0 : _b.code) || "no_response";
      const message = (_e = (_d = (_c = response == null ? void 0 : response.error) == null ? void 0 : _c.message) != null ? _d : chromeError) != null ? _e : "Unknown";
      const type = ((_f = response == null ? void 0 : response.error) == null ? void 0 : _f.type) || "Error";
      const target2 = `${(response == null ? void 0 : response.target) || request.target}:${request.path}`;
      bus.error = {
        code,
        message,
        target: target2
      };
      if (onError === "reject") {
        return reject(bus.error);
      }
      if (onError === "warn" && code !== "no_response") {
        console.warn(`extension-bus[${source}] ${type} at "${target2}": ${message}`);
      } else if (typeof onError === "function") {
        return resolve(onError(request, response, bus));
      }
      return resolve(null);
    }
    return resolve(response.result);
  };
  function call(path, data) {
    return new Promise((resolve, reject) => {
      bus.error = null;
      const request = makeRequest(source, target, path, data);
      return chrome.runtime.sendMessage(request, (response) => handleResponse(response, request, resolve, reject));
    });
  }
  function callTab(tabId, path, data) {
    return new Promise(function(resolve, reject) {
      bus.error = null;
      const request = makeRequest(source, "*", path, data);
      return chrome.tabs.sendMessage(tabId, request, (response) => handleResponse(response, request, resolve, reject));
    });
  }
  function callExtension(extensionId, path, data) {
    return new Promise(function(resolve, reject) {
      bus.error = null;
      const request = makeRequest(source, "*", path, data);
      return chrome.runtime.sendMessage(extensionId, request, (response) => handleResponse(response, request, resolve, reject));
    });
  }
  chrome.runtime.onMessage.addListener(handleRequest);
  if (options.external) {
    chrome.runtime.onMessageExternal.addListener(handleExternalRequest);
  }
  const {
    handlers = {},
    onError = "warn",
    target = "*"
  } = options;
  const bus = {
    source,
    target,
    handlers,
    call,
    callTab,
    callExtension,
    add(name, newHandlers) {
      handlers[name] = newHandlers;
      return bus;
    },
    error: null
  };
  return bus;
};
export {
  getHandler,
  makeBus
};
//# sourceMappingURL=index.mjs.map