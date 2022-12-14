#pragma once

namespace FireboltSDK {

    typedef enum {
        None = 0,
        General = 1,
        Unavailable = 2,
        Timedout = 3,
        NotRegistered = 4,
        Unknown = 5,
        InUse = 6,
    } Error;
}

