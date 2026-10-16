#!/usr/bin/env bash
# Sets up the Photo storage (SCRUM-42) in the AWS account of the host:
#   1. a private S3 bucket squadmeet-photos-<account id> in AWS_REGION (all public access
#      blocked, only the bucket owner owns objects, encrypted by S3 by default),
#   2. the permission for the host role squadmeet-ec2 to put, get and delete Photos there
#      (no stored keys; the backend uses the role),
#   3. the bucket name in Parameter Store (/squadmeet/photo-bucket); host-deploy.sh puts it
#      into the .env as PHOTO_BUCKET,
#   4. IMDS hop limit 2 on the instance, so the backend container (one network hop more than
#      the host) can get the role's credentials with IMDSv2. setup-aws.sh starts new
#      instances with it.
# Safe to run again. After it, the next deploy turns Photos on.
#
# Usage: deploy/setup-photos.sh <instance-id>   (AWS_REGION must be set)
# Needs: aws (CLI v2, logged in), jq.
set -euo pipefail

INSTANCE_ID="${1:?Usage: deploy/setup-photos.sh <instance-id>}"
: "${AWS_REGION:?}"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
NAME="squadmeet"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="$NAME-photos-$ACCOUNT_ID"

if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  echo "✓ Bucket $BUCKET exists"
else
  aws s3api create-bucket --bucket "$BUCKET" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  echo "✓ Bucket $BUCKET created"
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-ownership-controls --bucket "$BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
echo "✓ Bucket $BUCKET is private"

aws iam put-role-policy --role-name "$NAME-ec2" --policy-name "$NAME-photos" \
  --policy-document "$(jq -n --arg arn "arn:aws:s3:::$BUCKET/places/*" '{
    Version: "2012-10-17",
    Statement: [{Effect: "Allow", Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
                 Resource: $arn}]}')"
echo "✓ Role $NAME-ec2 may put, get and delete Photos in $BUCKET/places/"

aws ssm put-parameter --name "/$NAME/photo-bucket" --type String --value "$BUCKET" \
  --overwrite >/dev/null
echo "✓ Parameter /$NAME/photo-bucket = $BUCKET"

aws ec2 modify-instance-metadata-options --instance-id "$INSTANCE_ID" \
  --http-tokens required --http-endpoint enabled --http-put-response-hop-limit 2 >/dev/null
echo "✓ $INSTANCE_ID: IMDSv2 with hop limit 2 (the backend container reaches the role)"
echo "Next: deploy again (a merge into main, or deploy/deploy.sh main); then Photos are on."
