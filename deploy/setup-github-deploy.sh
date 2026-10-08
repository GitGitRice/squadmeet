#!/usr/bin/env bash
# Lets GitHub Actions deploy to the EC2 host without stored AWS keys (SCRUM-23).
# Creates (or updates) in AWS:
#   - the OIDC provider for GitHub Actions (token.actions.githubusercontent.com),
#   - the IAM role squadmeet-github-deploy. Only workflow runs on the main branch of
#     GitGitRice/squadmeet may assume it. It may only send AWS-RunShellScript to our one
#     instance and read the result.
# Then it sets the GitHub variable AWS_DEPLOY_ROLE_ARN (an ARN is not a secret).
# Safe to run again. The setup wizard (setup-aws.sh, stage 10) runs it.
#
# Usage: deploy/setup-github-deploy.sh <instance-id>     (AWS_REGION must be set)
# Needs: aws (CLI v2, logged in), jq, gh (logged in).
set -euo pipefail

INSTANCE_ID="${1:?Usage: deploy/setup-github-deploy.sh <instance-id>}"
: "${AWS_REGION:?}"
export AWS_REGION
REPO="GitGitRice/squadmeet"
ROLE="squadmeet-github-deploy"
ISSUER="token.actions.githubusercontent.com"

account_id=$(aws sts get-caller-identity --query Account --output text)
provider_arn="arn:aws:iam::$account_id:oidc-provider/$ISSUER"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$provider_arn" >/dev/null 2>&1; then
  echo "✓ OIDC provider for GitHub exists"
else
  # AWS checks GitHub's certificate itself; the thumbprint is not needed any more.
  aws iam create-open-id-connect-provider --url "https://$ISSUER" \
    --client-id-list sts.amazonaws.com >/dev/null
  echo "✓ OIDC provider for GitHub created"
fi

# The repo uses GitHub's immutable subject, so the token's sub claim carries the owner
# and repo IDs (repo:Owner@id/name@id:...). Ask GitHub for the prefix instead of building
# it from $REPO; a wrong prefix fails with "Not authorized to perform
# sts:AssumeRoleWithWebIdentity". StringEquals is case-sensitive.
sub_prefix=$(gh api "repos/$REPO/actions/oidc/customization/sub" --jq .sub_claim_prefix)
trust=$(jq -n --arg provider "$provider_arn" --arg sub "$sub_prefix:ref:refs/heads/main" '{
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Principal: {Federated: $provider},
    Action: "sts:AssumeRoleWithWebIdentity",
    Condition: {StringEquals: {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": $sub}}}]}')

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "$trust"
  echo "✓ Role $ROLE exists, trust policy updated"
else
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$trust" \
    --description "GitHub Actions on main of $REPO deploys through SSM (SCRUM-23)" >/dev/null
  echo "✓ Role $ROLE created"
fi

# SendCommand needs both the instance and the document as resources.
# GetCommandInvocation has no resource-level permissions, so it needs "*" (read only).
permissions=$(jq -n \
  --arg instance "arn:aws:ec2:$AWS_REGION:$account_id:instance/$INSTANCE_ID" \
  --arg document "arn:aws:ssm:$AWS_REGION::document/AWS-RunShellScript" '{
  Version: "2012-10-17",
  Statement: [
    {Effect: "Allow", Action: "ssm:SendCommand", Resource: [$instance, $document]},
    {Effect: "Allow", Action: "ssm:GetCommandInvocation", Resource: "*"}]}')
aws iam put-role-policy --role-name "$ROLE" --policy-name squadmeet-deploy-via-ssm \
  --policy-document "$permissions"
echo "✓ Role may send AWS-RunShellScript to $INSTANCE_ID only"

role_arn=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)
gh variable set AWS_DEPLOY_ROLE_ARN --repo "$REPO" --body "$role_arn" >/dev/null
echo "✓ GitHub variable AWS_DEPLOY_ROLE_ARN = $role_arn"
