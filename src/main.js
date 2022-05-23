const redis = require("redis");
const fs = require("fs");
const path = require("path");

function btoc(method, url) {
  return `${method}${url}`;
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

const defaultOptions = {
  dashboardUrl: "/dashboard",
  dataProvider: new DataProvider(),
  htmlArgs: { title: "Hi! Dashboard" },
};

export default function (options) {
  options = Object.assign({}, defaultOptions, options);

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
        options.dataProvider
          .getItems()
          .then((val) => res.json(val))
          .catch((err) => res.status(502).send(err.toString()));
        break;
      // set items status ohhh
      case `POST${options.dashboardUrl}/items`:
        if (!req.body || typeof req.body !== "object") {
          throw new Error("req.body no get object");
        }
        options.dataProvider
          .setItems(req.body)
          .then(() => res.json({ ok: true }))
          .catch((err) => res.status(501).send(err.toString()));
        break;
      default:
        next();
    }
  };
}
