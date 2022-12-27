#pragma once
#include "Types.h"

namespace FireboltSDK {

    class Logger {
    private:
        static constexpr uint16_t MaxBufSize = 512;

    public:
        enum class LogLevel : uint8_t {
            Error,
            Warning,
            Info,
            Debug,
            MaxLevel
        };

    public:
        Logger() = default;
        Logger(const Logger&) = delete;
        Logger& operator=(const Logger&) = delete;
        ~Logger() = default;

    public:
        static void Log(LogLevel level, const std::string& module, const std::string& format, ...);
        static uint32_t SetLogLevel(LogLevel logLevel);

    private:
        static LogLevel _logLevel;
    };
}

#define FIREBOLT_LOG(level, module, ...) \
    FireboltSDK::Log(level, module, __VA_ARGS__)

#define FIREBOLT_LOG_ERROR(module, ...) \
    FIREBOLT_LOG(FireboltSDK::LogLevel::Error, module, __VA_ARGS__)
#define FIREBOLT_LOG_WARNING(module, ...) \
    FIREBOLT_LOG(FireboltSDK::LogLevel::Warning, module, __VA_ARGS__)
#define FIREBOLT_LOG_INFO(module, ...) \
    FIREBOLT_LOG(FireboltSDK::LogLevel::Info, module, __VA_ARGS__)
#define FIREBOLT_LOG_DEBUG(module, ...) \
    FIREBOLT_LOG(FireboltSDK::LogLevel::Debug, module, __VA_ARGS__)

#ifdef ENABLE_SYSLOG
#define LOG_MESSAGE(message) \
    syslog(sLOG_NOTIC, "%s", message);
#else
#define LOG_MESSAGE(message) \
    fprintf(stderr, "%s", message); fflush(stdout);
#endif
