FROM node:6.8.0

MAINTAINER Federico Feroldi <fferoldi@measurence.com>

ENV NODE_ENV production

# ENV AUTH_JSON
# ENV SLACK_TOKEN
# ENV SPREADSHEET_ID

ADD package.json package.json

RUN npm install

ADD build build
 
CMD node ./build/index.js
