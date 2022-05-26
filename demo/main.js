const dashboard = require('..').default;
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json())
app.use(new dashboard());

app.listen(3000);