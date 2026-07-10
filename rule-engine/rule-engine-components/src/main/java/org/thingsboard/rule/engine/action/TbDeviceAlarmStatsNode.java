/**
 * Copyright © 2016-2026 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.rule.engine.action;

import lombok.extern.slf4j.Slf4j;
import org.thingsboard.rule.engine.api.EmptyNodeConfiguration;
import org.thingsboard.rule.engine.api.RuleNode;
import org.thingsboard.rule.engine.api.TbContext;
import org.thingsboard.rule.engine.api.TbNode;
import org.thingsboard.rule.engine.api.TbNodeConfiguration;
import org.thingsboard.rule.engine.api.TbNodeException;
import org.thingsboard.rule.engine.api.TimeseriesSaveRequest;
import org.thingsboard.server.common.data.Device;
import org.thingsboard.server.common.data.alarm.AlarmInfo;
import org.thingsboard.server.common.data.alarm.AlarmQuery;
import org.thingsboard.server.common.data.alarm.AlarmSearchStatus;
import org.thingsboard.server.common.data.id.DeviceId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.kv.BasicTsKvEntry;
import org.thingsboard.server.common.data.kv.LongDataEntry;
import org.thingsboard.server.common.data.kv.TsKvEntry;
import org.thingsboard.server.common.data.page.PageData;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.page.TimePageLink;
import org.thingsboard.server.common.data.plugin.ComponentType;
import org.thingsboard.server.common.msg.TbMsg;
import org.thingsboard.server.common.msg.TbMsgMetaData;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@RuleNode(
        type = ComponentType.ACTION,
        name = "device alarm stats",
        configClazz = EmptyNodeConfiguration.class,
        nodeDescription = "Counts alarms per device for day/week/month periods and saves as telemetry.",
        nodeDetails = "For each incoming message, iterates over all tenant devices, counts alarms " +
                "created in the last day, week, and month, and saves the counts as a JSON telemetry " +
                "entry (key: <code>alarm_stats</code>) on each device.<br><br>" +
                "Output connections: <code>Success</code>, <code>Failure</code>.",
        configDirective = "tbNodeEmptyConfig",
        icon = "assessment",
        docUrl = "https://allshen.org/docs/user-guide/rule-engine-2-0/nodes/action/device-alarm-stats/"
)
public class TbDeviceAlarmStatsNode implements TbNode {

    @Override
    public void init(TbContext ctx, TbNodeConfiguration configuration) throws TbNodeException {
        // No configuration needed
    }

    @Override
    public void onMsg(TbContext ctx, TbMsg msg) {
        TenantId tenantId = ctx.getTenantId();
        long now = System.currentTimeMillis();
        long dayStart   = now - 24L * 3600_000;
        long weekStart  = now - 7L * 24 * 3600_000;
        long monthStart = now - 30L * 24 * 3600_000;

        List<Device> allDevices = new ArrayList<>();
        PageLink pageLink = new PageLink(1_000); // fetch up to 1000 devices per page
        boolean hasNext;
        do {
            PageData<Device> page = ctx.getDeviceService().findDevicesByTenantId(tenantId, pageLink);
            allDevices.addAll(page.getData());
            hasNext = page.hasNext();
            pageLink = pageLink.nextPageLink();
        } while (hasNext);

        log.info("[{}] Starting alarm stats for {} devices", tenantId, allDevices.size());

        AtomicInteger processed = new AtomicInteger(0);
        AtomicInteger errors = new AtomicInteger(0);

        for (Device device : allDevices) {
            try {
                DeviceId deviceId = device.getId();
                EntityId originator = deviceId;

                // Count alarms in each period using AlarmQuery with TimePageLink
                int dayCount = countAlarms(ctx, tenantId, originator, dayStart, now);
                int weekCount = countAlarms(ctx, tenantId, originator, weekStart, now);
                int monthCount = countAlarms(ctx, tenantId, originator, monthStart, now);

                // Save as telemetry on the device with alarms_ prefix
                List<TsKvEntry> entries = List.of(
                        new BasicTsKvEntry(now, new LongDataEntry("alarms_day", (long) dayCount)),
                        new BasicTsKvEntry(now, new LongDataEntry("alarms_week", (long) weekCount)),
                        new BasicTsKvEntry(now, new LongDataEntry("alarms_month", (long) monthCount))
                );
                TimeseriesSaveRequest request = TimeseriesSaveRequest.builder()
                        .tenantId(tenantId)
                        .entityId(deviceId)
                        .entries(entries)
                        .ttl(0L)
                        .strategy(TimeseriesSaveRequest.Strategy.PROCESS_ALL)
                        .build();

                ctx.getTelemetryService().saveTimeseries(request);
                processed.incrementAndGet();

            } catch (Exception e) {
                log.warn("[{}] Failed to process device [{}]: {}", tenantId, device.getId(), e.getMessage());
                errors.incrementAndGet();
            }
        }

        log.info("[{}] Alarm stats completed: {} devices processed, {} errors",
                tenantId, processed.get(), errors.get());

        // Update message metadata with summary
        TbMsgMetaData resultMetaData = msg.getMetaData().copy();
        resultMetaData.putValue("devicesTotal", String.valueOf(allDevices.size()));
        resultMetaData.putValue("devicesProcessed", String.valueOf(processed.get()));
        resultMetaData.putValue("devicesErrors", String.valueOf(errors.get()));
        resultMetaData.putValue("statsExecutedAt", String.valueOf(now));

        TbMsg result = ctx.transformMsg(msg, resultMetaData, msg.getData());
        ctx.tellSuccess(result);
    }

    private int countAlarms(TbContext ctx, TenantId tenantId, EntityId originator,
                             long startTime, long endTime) {
        TimePageLink timePageLink = new TimePageLink(
                1, 0, null, null, startTime, endTime);
        AlarmQuery query = new AlarmQuery(
                originator, timePageLink, AlarmSearchStatus.ANY, null, null, false);
        PageData<AlarmInfo> result = ctx.getAlarmService().findAlarms(tenantId, query);
        return (int) result.getTotalElements();
    }

    @Override
    public void destroy() {
        // No resources to clean up
    }
}
