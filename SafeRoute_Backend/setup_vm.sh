#!/bin/bash
# setup_vm.sh - Run on the Azure VM

echo "Updating system..."
sudo apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive sudo apt-get upgrade -y -q

echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

echo "Installing Docker Compose..."
sudo apt-get install docker-compose-plugin -y
sudo apt-get install docker-compose -y

echo "Configuring permissions for user: imrpittala..."
sudo usermod -aG docker imrpittala

echo "Environment ready!"
