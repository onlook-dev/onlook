#!/bin/sh
while [ "$#" -gt 0 ] && [ "$1" != "-c" ]; do shift; done
exec /bin/sh "$@"
