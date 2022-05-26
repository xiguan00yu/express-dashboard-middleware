## Express Dashboard Middleware


> A middleware providing dashboard, free to modify variables and control everything in the program.


### I. How to use

    // import module
    const dashboard = require('express-dashboard')
    // ...
    const app = express();
    // *It is required*
    app.use(bodyParser.json())
    app.use(new dashboard({...}));
    app.listen(PROT);


### I. What it provides me

- DataProvider (default: redis)

    You can customize the data source according to your own needs and monitor the data changes.

- SafeSessions (default: MemorySessions and 2fa auth)

    You can be used to customize the sessions logic and let the dashboard log in your way.

- defalut (express-dashboard)

    The following api will be provided:

    - `GET /dashboard` -> render dashboard page
    - `GET /dashboard/items` -> will return `DataProvider.getItems`
    - `POST /dashboard/items` -> use `DataProvider.setItems` change item value
    - `POST /dashboard/verify` -> use `SafeSessions.verifyAuth` and `SafeSessions.newCookie` to generate a new session

    > It's worth saying that you can customize the path `options.dashboardUrl`