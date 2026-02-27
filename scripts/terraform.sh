#!/bin/bash

set -e

echo "🚀 Ejecutando Terraform para Finlab..."

cd terraform

echo "📦 terraform init"
terraform init

echo "🔎 terraform validate"
terraform validate

echo "📋 terraform plan"
terraform plan

echo "🏗 terraform apply"
terraform apply -auto-approve

echo "✅ Proceso terminado correctamente."