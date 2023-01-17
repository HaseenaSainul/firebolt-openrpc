#!/bin/bash

usage()
{
   echo "options:"
   echo "    -b branch name"
   echo "    -h : help"
   echo 
   echo "usage: "
   echo "    ./prepare.sh -b dev"
}

branch="master"

while getopts b:fh flag
do
    case "${flag}" in
        b) branch="${OPTARG}";;
	h) usage && exit 1;; 
    esac
done

export THUNDER_ROOT="`pwd`/src"
mkdir -p ${THUNDER_ROOT}
cd ${THUNDER_ROOT}

if [ ! -d "${THUNDER_ROOT}/Thunder" ]; then
    # Fetch thunder code
    git clone git@github.com:rdkcentral/Thunder 
fi

if [ "$branch" != "master" ]; then
    echo "dev branch " $branch
    cd Thunder
    # Stash all changes to make proper checkout
    git stash
    git checkout master
    # pull latest changes and branch details
    git pull origin master
    git pull
    git checkout $branch
    cd -
fi
echo "Checkout is completed"
