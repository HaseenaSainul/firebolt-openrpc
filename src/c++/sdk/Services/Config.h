namespace WPEFramework {
namespace OpenRPC {
    class EXTERNAL Config : public Core::JSON::Container {
    public:
        Config(const Config&) = delete;
        Config& operator=(const Config&) = delete;

        Config()
            : Core::JSON::Container()
            , Address(_T("0.0.0.0"))
            , Port(80)
	{
            Add(_T("port"), &Port);
            Add(_T("address"), &Address);
	}

    public:
	Core::JSON::String Address;
	Core::JSON::DecUInt16 Port;
    };
}
}
