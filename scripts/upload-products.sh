#!/usr/bin/env bash
# Uploads the paid product ZIPs to the private R2 bucket the site serves downloads from.
#
# The product files are paid content, so they are NOT kept in this (public) repo.
# Keep them in a private folder on your computer and run, from the repo root:
#
#   npx wrangler login              # once
#   scripts/upload-products.sh ~/buzzyfly-product-files
#
# The folder must contain the ZIPs named after their product IDs
# (see PRODUCT_FILE_MAP in src/data/monetization.ts). Missing ones are skipped.
set -euo pipefail

dir="${1:?Usage: scripts/upload-products.sh <folder with the product ZIPs>}"
bucket="buzzyfly-products"
products=(
	buzzyfly-digital-system
	weekly-reset-checklist
	follow-up-email-templates
	client-onboarding-kit
	complete-business-bundle
)

uploaded=0
for product in "${products[@]}"; do
	file="$dir/$product.zip"
	if [[ ! -f "$file" ]]; then
		echo "skip: $file not found"
		continue
	fi
	npx wrangler r2 object put "$bucket/products/$product.zip" --file "$file" --content-type application/zip --remote
	uploaded=$((uploaded + 1))
done
echo "Uploaded $uploaded of ${#products[@]} products to $bucket."
