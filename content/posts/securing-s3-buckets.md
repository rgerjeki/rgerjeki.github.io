+++
title = "A Practical Baseline for Locking Down Amazon S3"
date = 2026-07-07T09:00:00-07:00
draft = false
slug = "securing-s3-buckets"
description = "A no-nonsense starting checklist for keeping S3 data private: block public access, default encryption, least-privilege bucket policies, and a way to prove it stays that way."
tags = ["aws", "s3", "security", "cloud"]

# Optional cover image (shown on cards + post header). Drop a file in
# static/images/posts/ and point to it, e.g. "/images/posts/s3-lockdown.png".
cover = ""

# --- Syndication --------------------------------------------------------------
# This starter post ships with syndication OFF so it never touches your real
# Dev.to account by accident. Flip to true (and add the DEV_TO_TOKEN secret) to
# cross-post. The canonical URL stays https://rgerjeki.github.io/blog/securing-s3-buckets/.
devto = false
# series = "Cloud Security Baselines"
# devto_url = ""   # optional: paste the Dev.to article URL after first publish
+++

Most S3 data leaks are not exotic. They come from a bucket that was quietly made
public, a policy that granted more than it needed, or encryption that was never
turned on. This is a starter checklist — the boring controls that stop the
majority of incidents — plus a couple of commands to verify each one actually
took effect.

<!--more-->

## Block public access at the account level

The single highest-value control is **S3 Block Public Access**. Turn it on at the
account level so a misconfigured bucket policy can't silently expose data:

```bash
aws s3control put-public-access-block \
  --account-id "$(aws sts get-caller-identity --query Account --output text)" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Account-level settings override anything set per bucket, so even a future
`"Principal": "*"` policy can't make objects world-readable.

## Turn on default encryption

New buckets are encrypted by default with SSE-S3, but make it explicit and prefer
SSE-KMS when you want auditable, revocable keys:

```bash
aws s3api put-bucket-encryption \
  --bucket my-app-data \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "aws:kms" },
      "BucketKeyEnabled": true
    }]
  }'
```

> `BucketKeyEnabled` cuts KMS request costs dramatically on high-throughput
> buckets by using a short-lived bucket-level key instead of calling KMS per
> object.

## Write bucket policies for least privilege

A good bucket policy grants the *minimum* required and denies everything
insecure. Two clauses belong on almost every bucket — deny non-TLS requests, and
deny uploads that aren't encrypted:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-app-data",
        "arn:aws:s3:::my-app-data/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUnEncryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-app-data/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
      }
    }
  ]
}
```

Scope the `Resource` to specific prefixes where you can, and grant read/write to
named roles rather than broad principals.

## Prove it — and keep proving it

Controls drift. A tiny check you can run in CI or on a schedule catches a bucket
that slipped back to public:

```python
import boto3

s3 = boto3.client("s3")

for bucket in s3.list_buckets()["Buckets"]:
    name = bucket["Name"]
    try:
        pab = s3.get_public_access_block(Bucket=name)["PublicAccessBlockConfiguration"]
        if not all(pab.values()):
            print(f"[WARN] {name}: public access not fully blocked -> {pab}")
    except s3.exceptions.ClientError:
        print(f"[WARN] {name}: no public access block configured")
```

For anything beyond a handful of buckets, wire the same idea into **AWS Config**
rules (`s3-bucket-public-read-prohibited`, `s3-bucket-server-side-encryption-enabled`)
so evaluation is continuous instead of a script you have to remember to run.

## The short version

- Block Public Access on at the account level.
- Default encryption on, preferably SSE-KMS with bucket keys.
- Bucket policies deny non-TLS and unencrypted uploads, and grant least privilege.
- A recurring check (script or AWS Config) proves the state didn't drift.

None of this is clever. That's the point — the baseline should be so routine that
skipping it is the thing that looks strange.
