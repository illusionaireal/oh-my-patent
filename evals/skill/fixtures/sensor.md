# Synthetic sensor design / 合成传感器材料

This is a fictional engineering exercise, not a real unpublished invention or a claim
of novelty. All values below are assumptions for evaluating the workflow.

部件 101 为温度传感器，部件 102 为处理器。101 每秒发送一条温度测量值给 102。
处理器保存最近 8 条有效测量值，用中位数生成平滑读数；连续 3 条测量偏离当前中位数
超过 2 摄氏度时，记录异常并保留原始测量。未提供通信模块、云端服务或电池设计。
未做性能测试，不能给出降低误报或提高精度的实测百分比。

Part 101 is a temperature sensor and part 102 is a processor. The sensor sends one
measurement per second to the processor. The processor retains the last eight valid
measurements and computes their median. Three consecutive measurements more than
2 degrees Celsius from the median trigger an anomaly record, retaining raw data.
No radio, cloud service or battery design is specified. There are no measured accuracy
or false-positive improvements. Ask for missing technical facts when needed.

The evaluation operator may answer clarification questions using only these facts.
Novelty remains unverified; supplied literature is synthetic, not a search result.
