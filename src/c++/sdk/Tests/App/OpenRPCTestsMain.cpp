#include "Module.h"
#include "OpenRPCTests.h"

int __cnt = 0;
int __pass = 0;

int TotalTests = 0;
int TotalTestsPassed = 0;

int main()
{
    OpenRPC::Tests openrpcTest;

    for(auto i = openrpcTest.TestList().begin(); i != openrpcTest.TestList().end(); i++) {
        EXECUTE(i->first.c_str(), i->second);
    }

    printf("TOTAL: %i tests; %i PASSED, %i FAILED\n", TotalTests, TotalTestsPassed, (TotalTests - TotalTestsPassed));

    return 0;
}

