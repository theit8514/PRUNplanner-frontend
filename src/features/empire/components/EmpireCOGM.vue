<script setup lang="ts">
	import { PropType, ref, Ref, watch } from 'vue';

	// Components
	import MaterialTile from '@/features/material_tile/components/MaterialTile.vue';
	import PlanCOGM from '@/features/planning/components/tools/PlanCOGM.vue';

	// Util
	import { formatNumber } from '@/util/numbers';

	// UI
	import { PButton } from '@/ui';
	import { XNDataTable, XNDataTableColumn } from '@skit/x.naive-ui';
	import { NModal } from 'naive-ui';
	import type { IProductionBuildingRecipeCOGM } from '@/features/planning/usePlanCalculation.types';
	import type { IEmpireCOGMRow } from '@/features/empire/empire.types';
	import { AnalyticsOutlined } from '@vicons/material';

	const props = defineProps({
		rows: {
			type: Array as PropType<IEmpireCOGMRow[]>,
			default: () => [],
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const showDetails: Ref<boolean> = ref(false);
	const detailsCogm: Ref<IProductionBuildingRecipeCOGM | null> = ref(null);
	const detailsPlanetId: Ref<string | undefined> = ref(undefined);
	/** Key of the row currently shown in the details modal (so we can refresh when rows update). */
	const detailsRowKey: Ref<string | null> = ref(null);

	function rowKey(row: IEmpireCOGMRow): string {
		const inputSig = row.cogm.inputCost
			.slice()
			.sort((a, b) => a.ticker.localeCompare(b.ticker))
			.map((c) => `${c.ticker}:${c.amount}`)
			.join(',');
		return `${row.planUuid}|${row.ticker}|${inputSig}`;
	}

	function openDetails(row: IEmpireCOGMRow): void {
		detailsCogm.value = row.cogm;
		detailsPlanetId.value = row.planetNaturalId ?? undefined;
		detailsRowKey.value = rowKey(row);
		showDetails.value = true;
	}

	// When rows are recalculated (e.g. after Save/Reload in popup), refresh the modal data if it's open.
	watch(
		() => props.rows,
		(rows) => {
			if (!showDetails.value || !detailsRowKey.value || !rows.length)
				return;
			const match = rows.find((r) => rowKey(r) === detailsRowKey.value);
			if (match) {
				detailsCogm.value = match.cogm;
				detailsPlanetId.value = match.planetNaturalId ?? undefined;
			}
		},
		{ deep: true }
	);
</script>

<template>
	<n-modal
		v-model:show="showDetails"
		preset="card"
		title="Cost of Goods Manufactured"
		:class="cxUuid ? 'max-w-250' : 'max-w-150'">
		<PlanCOGM
			v-if="detailsCogm"
			:cogm-data="detailsCogm"
			:cx-uuid="cxUuid"
			:planet-id="detailsPlanetId" />
	</n-modal>
	<XNDataTable :data="rows" striped>
		<XNDataTableColumn
			key="planName"
			title="Plan"
			sorter="default"
			default-sort-order="ascend">
			<template #render-cell="{ rowData }">
				{{ rowData.planName }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="inputs" title="Inputs">
			<template #render-cell="{ rowData }">
				<div class="flex flex-wrap gap-1">
					<MaterialTile
						v-for="input in rowData.cogm.inputCost"
						:key="input.ticker"
						:ticker="input.ticker"
						:amount="input.amount" />
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="ticker" title="Output" sorter="default">
			<template #render-cell="{ rowData }">
				<MaterialTile
					:key="`#${rowData.ticker}#${rowData.amount}`"
					:ticker="rowData.ticker"
					:amount="rowData.amount" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="costSplit" title="COGM" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap text-end">
					{{ formatNumber(rowData.costSplit) }}
					<span class="pl-1 font-light text-white/50"> $ </span>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="details" title="">
			<template #render-cell="{ rowData }">
				<div class="flex justify-center">
					<PButton
						size="sm"
						title="COGM details"
						@click="openDetails(rowData)">
						<template #icon>
							<AnalyticsOutlined />
						</template>
					</PButton>
				</div>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
