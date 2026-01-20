import AWS from "aws-sdk";
import mongoose from "mongoose";
import { simpleParser } from "mailparser";
import crypto from "crypto";

/* AWS Clients */
const s3 = new AWS.S3();
const ses = new AWS.SES({ region: process.env.AWS_REGION });

/* Mongo Singleton */
let isConnected = false;

async function connectMongo() {
  if (isConnected) return;

  await mongoose.connect(process.env.ConnectionString, {
    dbName: process.env.MONGODB_DB,
    serverSelectionTimeoutMS: 5000
  });

  isConnected = true;
}

/* Schema (same as backend) */
const Communication =
  mongoose.models.Communication ||
  mongoose.model(
    "Communication",
    new mongoose.Schema({
      buyerEmail: String,
      sellerEmail: String,
      buyerProxy: String,
      sellerProxy: String,
      isActive: Boolean,
      expiresAt: Date
    })
  );

/* Safety */
function stripHeaders(raw) {
  return raw
    .replace(/^From:.*$/gim, "")
    .replace(/^Reply-To:.*$/gim, "")
    .replace(/^Return-Path:.*$/gim, "");
}

export const handler = async (event) => {
  await connectMongo();

  const record = event.Records?.[0]?.ses;
  if (!record) return;

  const proxyEmail = record.mail.destination[0].toLowerCase();

  if (!proxyEmail.endsWith(`@${process.env.PROXY_DOMAIN}`)) {
    console.warn("Blocked non-proxy email:", proxyEmail);
    return;
  }

  const s3Object = await s3
    .getObject({
      Bucket: record.receipt.action.bucketName,
      Key: record.receipt.action.objectKey
    })
    .promise();

  const parsed = await simpleParser(s3Object.Body);

  const comm = await Communication.findOne({
    isActive: true,
    expiresAt: { $gt: new Date() },
    $or: [{ buyerProxy: proxyEmail }, { sellerProxy: proxyEmail }]
  });

  if (!comm) {
    console.warn("No mapping found for:", proxyEmail);
    return;
  }

  const isBuyer = proxyEmail === comm.buyerProxy;
  const targetEmail = isBuyer ? comm.sellerEmail : comm.buyerEmail;
  const replyProxy = isBuyer ? comm.sellerProxy : comm.buyerProxy;

  let rawEmail = stripHeaders(s3Object.Body.toString());

  rawEmail =
    `From: ${process.env.SES_SENDER}\n` +
    `To: ${targetEmail}\n` +
    `Reply-To: ${replyProxy}\n` +
    `Message-ID: <${crypto.randomUUID()}@${process.env.PROXY_DOMAIN}>\n` +
    rawEmail;

  await ses.sendRawEmail({
    Destinations: [targetEmail],
    RawMessage: { Data: rawEmail }
  }).promise();

  console.log(`Forwarded ${proxyEmail} → ${targetEmail}`);
};
