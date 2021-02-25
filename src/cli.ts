#!/usr/bin/env node

import * as ts from "typescript";
import * as fs from "fs";

let file = fs.readFileSync(process.argv[2]);
eval(file.toString());
fs.writeFileSync(process.argv[3]);
