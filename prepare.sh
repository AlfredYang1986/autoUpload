#!/bin/bash

# Remove dupulicate package
rm -rf node_modules/\@types/mongodb
cp -r phlib/mongodb node_modules/\@types/mongodb

# first build
tsc
