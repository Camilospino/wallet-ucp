#!/bin/bash
cd /Users/camilorodriguez/Desktop/wallet
echo ">> $ git branch -a"
git --no-pager branch -a
echo
echo ">> $ git log --oneline -14"
git --no-pager log --oneline -14
echo
echo ">> $ git tag"
git --no-pager tag
echo
echo ">> $ git remote -v"
git --no-pager remote -v
