const redis = require("redis");
const fs = require("fs");
const path = require("path");
const twofactor = require("node-2fa");

function btoc(method, url) {
  return `${method}${url}`;
}

function parseCookie(str) {
  return str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});
}

export const DataProvider = function (
  options = {
    hkey: "2fa-dashboard",
  }
) {
  let connected = false;
  const client = redis.createClient();
  client
    .connect()
    .then(() => {
      connected = true;
      console.log("redis connected");
    })
    .catch((err) => {
      console.warn("redis connect error!", err.toString());
    });
  this.getItems = async () => {
    if (!connected) return;
    return await client.hGetAll(options.hkey);
  };
  this.setItems = async (
    o = {
      /** key:value */
    }
  ) => {
    if (!connected) return;
    // for allKeys to setHash map cooooool!
    for (const key in o) {
      await client.hSet(options.hkey, key, o[key]);
    }
  };
};

export const SafeSessions = function (
  options = {
    secret: "GJEEOS3YHGMEIKKXCQAL3QXIWU7R7NH3",
    salt: "2fa",
    age: 1000 * 60 * 15,
  }
) {
  // store sessions
  this.store = {};

  this.cookieKey = function () {
    return "switch-dashborad-middleware";
  };

  // login verify
  this.verifyAuth = function (pwd) {
    const res = twofactor.verifyToken(options.secret, pwd);
    return res && res.delta === 0;
  };

  // check cookie
  // return bool
  this.checkCookie = function (cookie) {
    if (!cookie) return false;
    if (typeof cookie !== "string") return false;
    // decrypt
    const key = Buffer.from(cookie, "base64").toString("utf8");
    if (!key.includes(options.salt)) {
      return false;
    }
    const body = this.store[cookie];
    // Determine whether it is overdue
    return body && body.age && Date.now() < body.age;
  };
  // new sessions
  // return key[string]
  this.newCookie = function (option) {
    const body = { age: Date.now() + options.age };
    if (typeof option === "object") {
      Object.assign(body, option);
    }
    if (typeof option === "string") {
      Object.assign(body, { option });
    }
    // encrypt
    const sessionsKey = Buffer.from(
      `${options.salt}${Date.now()}${Math.round(Math.random() * 1000)}`
    ).toString("base64");

    // only one
    if (Object.keys(this.store).length >= 1) {
      this.store = {};
    }
    this.store[sessionsKey] = body;
    return sessionsKey;
  };
};

const defaultOptions = {
  dashboardUrl: "/dashboard",
  dataProvider: new DataProvider(),
  safeChecker: new SafeSessions(),
  htmlArgs: { title: "Hi! Dashboard" },
};

// const secret = "l2022dashboard";

export default function (options) {
  options = Object.assign({}, defaultOptions, options);

  const isLogin = (req) => {
    if (!options.safeChecker) throw new Error("pls provide SafeSessions");
    const cookies =
      typeof req.headers.cookie === "string" && parseCookie(req.headers.cookie);
    const key = options.safeChecker.cookieKey();
    return options.safeChecker.checkCookie(cookies[key]);
  };

  const login = (req, res) => {
    if (!options.safeChecker) throw new Error("pls provide SafeSessions");
    res.cookie(
      options.safeChecker.cookieKey(),
      options.safeChecker.newCookie(req.ip)
    );
  };

  return function (req, res, next) {
    // switch path
    switch (btoc(req.method, req.url)) {
      // render dashboard page ... maybe all switchsssss
      case `GET${options.dashboardUrl}`:
        let htmlTemp = fs
          .readFileSync(path.join(__dirname, "../assets/main.html"))
          .toString();
        // replace <<$key>> to value
        Object.entries(options.htmlArgs).forEach(
          ([key, value]) =>
            (htmlTemp = htmlTemp.replace(
              new RegExp(`\\<\\<\\$${key}\\>\\>`, "g"),
              value
            ))
        );
        // .replace(/\<\<\$\w+\>\>/, '');
        return res.send(htmlTemp);
      // get items alllll yes!!
      case `GET${options.dashboardUrl}/items`:
        if (!isLogin(req)) {
          return res.status(403).end();
        }
        options.dataProvider
          .getItems()
          .then((val) => res.json(val))
          .catch((err) => res.status(502).send(err.toString()));
        break;
      // set items status ohhh
      case `POST${options.dashboardUrl}/items`:
        if (!isLogin(req)) {
          return res.status(403).end();
        }
        if (!req.body || typeof req.body !== "object") {
          throw new Error("req.body no get object");
        }
        options.dataProvider
          .setItems(req.body)
          .then(() => res.json({ ok: true }))
          .catch((err) => res.status(501).send(err.toString()));
        break;
      case `POST${options.dashboardUrl}/verify`:
        // TODO
        if (!req.body || typeof req.body !== "object") {
          throw new Error("req.body no get object");
        }
        if (!req.body.pwd || typeof req.body.pwd !== "string") {
          return res.status(501).send("req.body pwd error");
        }
        if (options.safeChecker.verifyAuth(req.body.pwd)) {
          login(req, res);
          return res.json({ ok: true });
        }
        return res.status(403).end();
      default:
        next();
    }
  };
}
