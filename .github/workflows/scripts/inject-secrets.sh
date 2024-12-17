#!/bin/bash

# Arguments
file_path=$1            # Path to the JS file
secret_value=$2         # Secret value passed from GitHub Actions
placeholder_key=$3      # pass the placeholder value want to replace

# Replace the placeholder with the secret
echo "Injecting secrets into ${file_path}..."
sed -i "s|__${placeholder_key}__|${secret_value}|g" "${file_path}"

echo "Secrets injected successfully!"