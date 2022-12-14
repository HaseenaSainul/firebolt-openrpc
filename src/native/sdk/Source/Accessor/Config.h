namespace FireboltSDK {
    class EXTERNAL Config : public WPEFramework::Core::JSON::Container {
    public:
        Config(const Config&) = delete;
        Config& operator=(const Config&) = delete;

        Config()
            : WPEFramework::Core::JSON::Container()
            , Url(_T(""))
            , WaitTime(1000)
        {
            Add(_T("url"), &Url);
            Add(_T("waittime"), &WaitTime);
        }

    public:
        WPEFramework::Core::JSON::String Url;
        WPEFramework::Core::JSON::DecUInt32 WaitTime;
    };
}
