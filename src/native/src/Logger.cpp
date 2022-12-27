#include "Module.h"
#include "Error.h"
#include "Logger.h"

namespace FireboltSDK {
    /* static */  Logger::LogLevel Logger::_logLevel = Logger::LogLevel::Error;

    uint32_t Logger::SetLogLevel(Logger::LogLevel logLevel)
    {
        ASSERT(logLevel < Logger::LogLevel::MaxLevel);
	uint32_t status = Error::NotSupported;
	if (logLevel < Logger::LogLevel::MaxLevel) {
            _logLevel = logLevel;
            status = Error::None;
	}
	return status;
    }

    void Logger::Log(Logger::LogLevel logLevel, const std::string& module, const std::string& format, ...)
    {
        ASSERT(logLevel < _logLevel);

        if (logLevel < _logLevel) {
            va_list arg;
            char buf[Logger::MaxBufSize];

            va_start(arg, format);
            int length = vsnprintf(buf, Logger::MaxBufSize, format.c_str(), arg);
            va_end(arg);

            uint32_t position = (length >= Logger::MaxBufSize) ? (Logger::MaxBufSize - 1) : length;
	    buf[position] = '\0';

            sprintf(buf, "\033[1;32m[%s:%d](%s)<PID:%d><TID:%ld><Module:%s>\n\033[0m:%s", &__FILE__[WPEFramework::Core::FileNameOffset(__FILE__)], __LINE__, __FUNCTION__, TRACE_PROCESS_ID, TRACE_THREAD_ID, module.c_str(), buf);
            LOG_MESSAGE(buf);
        }
    }
}

