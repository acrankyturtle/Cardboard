using Cardboard.Device;
using Cardboard.Repositories;

namespace DeviceTool;

public static class Ck130
{
	public static IReadOnlyCollection<DeviceKeyId> KeyIds { get; } =
	[
		DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
		DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
		DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
		DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
		DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
		DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
		DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
		DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
		DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
		DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
		DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
		DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
		DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
		DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
		DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
		DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
		DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
		DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
		DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
		DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
		DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
		DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
		DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
		DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
		DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
		DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
		DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
		DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
		DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
		DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
	];

	public static IEnumerable<Key> CreateKeys(params IReadOnlyCollection<KeyBindingLayers> deviceLayers) =>
		DeviceBuilder.Keys(KeyIds, deviceLayers);
}
