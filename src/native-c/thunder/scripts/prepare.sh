#!/bin/bash

usage()
{
   echo "options:"
   echo "    -b branch name for thunder"
   echo "    -t branch name for thunder tools"
   echo "    -h : help"
   echo 
   echo "usage: "
   echo "    ./prepare.sh -b dev"
}

branch="master"

while getopts b:t:fh flag
do
    case "${flag}" in
        b) branch="${OPTARG}";;
        t) toolsBranch="${OPTARG}";;
	h) usage && exit 1;; 
    esac
done

export THUNDER_ROOT="`pwd`/src"
mkdir -p ${THUNDER_ROOT}
cd ${THUNDER_ROOT}

if [ ! -d "${THUNDER_ROOT}/ThunderTools" ]; then
    # Fetch thunder tools code
    git clone git@github.com:rdkcentral/ThunderTools
fi

if [ "$toolsBranch" != "master" ]; then
    echo "dev branch " $branch
    cd ThunderTools
    # Stash all changes to make proper checkout
    git stash
    git checkout master
    # pull latest changes and branch details
    git pull origin master
    git pull
    git checkout $toolsBranch
    cd -
fi

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
