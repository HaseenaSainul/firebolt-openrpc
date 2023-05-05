rm -rf build
cmake -B./build -S. -DSYSROOT_PATH="/home/haseenasainul/firebolt-r2/firebolt-openrpc/firebolt" -DENABLE_TESTS="ON"
cmake --build ./build/
