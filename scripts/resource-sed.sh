#!/bin/bash
#
# simple sed commands to convert a resource definition such as found at https://developers.google.com/drive/v2/reference/about
# into a typescript definition
#
#  usage resource-sed.sh < infile > outfile

sed -e 's/":/"?:/' |\
sed -e 's/,$/;/' |\
sed -e 's/long/number/' |\
sed -e 's/double/number/' |\
sed -e 's/integer/number/' |\
sed -e 's/etag;/string;/' |\
sed -e 's/datetime;/string;/' |\
sed -e 's/kind": ".*";/kind": string;/' |\
  cat
