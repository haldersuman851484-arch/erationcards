# Delhivery API Setup Guide

Before the **Dispatch Orders** feature can create real shipments, you must add the following secrets in your Replit workspace (Settings → Secrets).

## Required Secrets

| Secret Key | Description | Example |
|---|---|---|
| `DELHIVERY_API_TOKEN` | API token from Delhivery client portal | `abc123xyz...` |
| `DELHIVERY_PICKUP_LOCATION` | Warehouse name registered in Delhivery | `MyWarehouse` |
| `DELHIVERY_RETURN_NAME` | Your business/seller name | `Ration Card Services` |
| `DELHIVERY_RETURN_PHONE` | Return phone number (10 digits) | `9876543210` |
| `DELHIVERY_RETURN_ADD` | Return/seller address | `123, Main Road, Kolkata` |
| `DELHIVERY_RETURN_PIN` | Return address pincode | `700001` |
| `DELHIVERY_RETURN_CITY` | Return city | `Kolkata` |
| `DELHIVERY_RETURN_STATE` | Return state | `West Bengal` |

## Optional Settings

| Secret Key | Description | Default |
|---|---|---|
| `DELHIVERY_ENV` | `staging` or `production` | `staging` |
| `DELHIVERY_WEIGHT_G` | Shipment weight in grams | `200` |

## How to Get Your API Token

1. Log in to the [Delhivery Client Portal](https://track.delhivery.com)
2. Go to **Settings → API** (or ask your Delhivery account manager)
3. Copy the API Token and add it as `DELHIVERY_API_TOKEN`

## Testing

Set `DELHIVERY_ENV=staging` to use the Delhivery sandbox at `https://staging-express.delhivery.com`. Switch to `production` only when you're ready for live shipments.

## What Happens When Secrets Are Missing

If any required secret is missing, the **"Dispatch via Delhivery"** button will return an error message listing the missing secrets. No shipment will be created. Set all secrets and restart the API server to enable dispatching.
