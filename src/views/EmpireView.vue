<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		defineAsyncComponent,
		ref,
		Ref,
		toRef,
		watch,
	} from "vue";

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: "Empire | PRUNplanner",
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	const planningStore = usePlanningStore();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { usePrice } from "@/features/cx/usePrice";
	const { combineEmpireMaterialIO, empireMaterialIOState } =
		await useMaterialIOUtil();
	const { defaultEmpireUuid } = usePreferences();

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";
	import ComputingProgress from "@/layout/components/ComputingProgress.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import EmpireMaterialIOFiltered from "@/features/empire/components/EmpireMaterialIOFiltered.vue";

	const AsyncEmpireCostOverview = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireCostOverview.vue")
	);
	const AsyncEmpirePlanList = defineAsyncComponent(
		() => import("@/features/empire/components/EmpirePlanList.vue")
	);

	const AsyncEmpireConfiguration = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireConfiguration.vue")
	);

	const AsyncWrapperGenericError = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGenericError.vue")
	);

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import {
		IPlanResult,
		IProductionBuildingRecipeCOGM,
	} from "@/features/planning/usePlanCalculation.types";
	import {
		IEmpireCostOverview,
		IEmpireMaterialIO,
		IEmpirePlanListData,
		IEmpirePlanMaterialIO,
		IEmpireCOGMRow,
	} from "@/features/empire/empire.types";

	// UI
	import {
		PForm,
		PFormItem,
		PSelect,
		PButton,
		PButtonGroup,
		PSpin,
	} from "@/ui";

	const props = defineProps({
		empireUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const internalEmpireUuid = ref(props.empireUuid || defaultEmpireUuid.value);

	const selectedEmpireUuid = computed({
		get: () => props.empireUuid || internalEmpireUuid.value,
		set: (val) => {
			if (val) {
				internalEmpireUuid.value = val;
				defaultEmpireUuid.value = val;
			}
		},
	});

	const selectedCXUuid: Ref<string | undefined> = ref(undefined);
	const refEmpireList: Ref<IPlanEmpireElement[]> = ref([]);

	const calculatedPlans: Ref<Record<string, IPlanResult>> = ref({});
	const planData: Ref<IPlan[]> = ref([]);

	const isCalculating: Ref<boolean> = ref(true);
	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */

	const cacheCalculatedPlans = new Map<string, IPlanResult>();

	/**
	 * Recalculates empire plans. When silent is true, runs in the background
	 * without showing the full-screen progress or unmounting content (preserves
	 * filter state). Use silent for e.g. CX preference updates from the COGM popup.
	 */
	async function calculateEmpire(
		clearCache = false,
		silent = false
	): Promise<void> {
		if (!silent) {
			isCalculating.value = true;

			calculatedPlans.value = {};
			progressTotal.value = planData.value.length;
			progressCurrent.value = 0;
		}

		if (clearCache) cacheCalculatedPlans.clear();

		// Always build the next state from current `planData` only.
		// (When switching empires, `planData` changes and we must not retain stale plans.)
		const nextPlans: Record<string, IPlanResult> = {};

		for (const plan of planData.value) {
			if (!plan.uuid) continue;
			// note, calculation depends on empire + cx, so a plan is only
			// calculated properly within this context

			const cacheKey: string = `${plan.uuid}#${selectedCXUuid.value}#${selectedCXUuid.value}`;

			if (cacheCalculatedPlans.has(cacheKey)) {
				nextPlans[plan.uuid!] = cacheCalculatedPlans.get(cacheKey)!;
				if (!silent) progressCurrent.value++;
			} else {
				await Promise.resolve();

				const { calculate } = await usePlanCalculation(
					toRef(plan),
					selectedEmpireUuid,
					refEmpireList,
					selectedCXUuid
				);

				const result = await calculate();
				nextPlans[plan.uuid!] = result;
				if (!silent) progressCurrent.value++;

				// cache
				cacheCalculatedPlans.set(cacheKey, result);
				// yield back to vue and update DOM
				if (!silent) await new Promise((r) => setTimeout(r, 0));
			}
		}

		calculatedPlans.value = nextPlans;
		if (!silent) isCalculating.value = false;

		empireMaterialIOState(
			selectedEmpire.value,
			combinedEmpireMaterialIO.value
		).then((data) => {
			if (data && selectedEmpire.value)
				useQuery("PatchEmpireState", {
					empireUuid: selectedEmpire.value.uuid,
					empireState: data,
				}).execute();
		});
	}

	// When the selected CX is updated in the store (e.g. Save/Reload in COGM popup),
	// recalculate silently so the grid and popup stay in sync — same as Plan view,
	// where usePlanCalculation watches store.cxs and recalculates automatically.
	watch(
		() =>
			selectedCXUuid.value
				? planningStore.cxs[selectedCXUuid.value]
				: undefined,
		() => {
			if (selectedCXUuid.value && planData.value.length)
				calculateEmpire(true, true);
		},
		{ deep: true }
	);

	/**
	 * Reloads empires forcefully by triggering store reload
	 * @author jplacht
	 *
	 * @async
	 */
	async function reloadEmpires() {
		// make a forced call to also update store
		refEmpireList.value = await useQuery("GetAllEmpires").execute();
		// trigger recalculation, changed config required new calculation
		await calculateEmpire(true);
	}

	/**
	 * Holds computed empire data for the currently selected empire.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanEmpireElement | undefined>} Empire Data
	 */
	const selectedEmpire: ComputedRef<IPlanEmpireElement | undefined> =
		computed(() => {
			return refEmpireList.value.find(
				(e) => e.uuid == selectedEmpireUuid.value
			);
		});

	/**
	 * Holds computed cost overview based on plan results.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpireCostOverview>} Empire Cost overview
	 */
	const costOverview: ComputedRef<IEmpireCostOverview> = computed(() => {
		const totalProfit: number = Object.values(calculatedPlans.value).reduce(
			(sum, element) => sum + element.profit,
			0
		);
		const totalRevenue: number = Object.values(
			calculatedPlans.value
		).reduce((sum, element) => sum + element.revenue, 0);
		const totalCost: number = Object.values(calculatedPlans.value).reduce(
			(sum, element) => sum + element.cost,
			0
		);
		const totalAreaUsed: number = Object.values(
			calculatedPlans.value
		).reduce((sum, element) => sum + element.area.areaUsed, 0);

		return {
			totalProfit,
			totalRevenue,
			totalCost,
			totalAreaUsed,
		};
	});

	/**
	 * Holds computed empire name.
	 * @author jplacht
	 *
	 * @type {ComputedRef<string>} Empire Cost overview
	 */
	const empireName: ComputedRef<string> = computed(() => {
		if (selectedEmpire.value) {
			return selectedEmpire.value.empire_name;
		}
		return "Unknown";
	});

	/**
	 * Holds computed empire plan data basic data.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpirePlanListData[]>} Plan List Data
	 */
	const planListData: ComputedRef<IEmpirePlanListData[]> = computed(() => {
		return Object.entries(calculatedPlans.value).map(
			([planUuid, planResult]) => {
				const plan: IPlan = planData.value.find(
					(p) => p.uuid == planUuid
				)!;

				return {
					uuid: planUuid,
					name: plan.plan_name,
					planet: plan.planet_natural_id,
					permits: plan.plan_permits_used,
					cogc: plan.plan_cogc,
					profit: planResult.profit,
				};
			}
		);
	});

	/**
	 * Holds computed material i/o per plan with additional information.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpirePlanMaterialIO[]>} Empire Material IO Data
	 */
	const empireMaterialIO: ComputedRef<IEmpirePlanMaterialIO[]> = computed(
		() => {
			return Object.entries(calculatedPlans.value).map(
				([planUuid, planResult]) => {
					const plan: IPlan = planData.value.find(
						(p) => p.uuid == planUuid
					)!;
					return {
						planetId: plan.planet_natural_id,
						planUuid: planUuid,
						planName: plan.plan_name ?? "Unknown Plan Name",
						planCOGC: plan.plan_cogc,
						materialIO: planResult.materialio,
					};
				}
			);
		}
	);

	const combinedEmpireMaterialIO: ComputedRef<IEmpireMaterialIO[]> = computed(
		() => combineEmpireMaterialIO(empireMaterialIO.value)
	);

	/**
	 * Stable signature for recipe inputs (ticker:amount pairs, sorted by ticker)
	 * so rows with the same plan, inputs and output can be deduplicated.
	 */
	function getCogmInputSignature(cogm: IProductionBuildingRecipeCOGM): string {
		return cogm.inputCost
			.slice()
			.sort((a, b) => a.ticker.localeCompare(b.ticker))
			.map((c) => `${c.ticker}:${c.amount}`)
			.join(",");
	}

	/**
	 * Holds computed COGM rows for the currently selected empire.
	 * Rows with the same plan, input set and output ticker are merged (e.g. two
	 * H2O→DW lines become one); recipes with different inputs stay separate.
	 *
	 * @type {ComputedRef<IEmpireCOGMRow[]>} COGM Rows
	 */
	const empireCogm: ComputedRef<IEmpireCOGMRow[]> = computed(() => {
		const rawRows: { key: string; row: IEmpireCOGMRow }[] = [];

		for (const [planUuid, planResult] of Object.entries(
			calculatedPlans.value
		)) {
			const plan = planData.value.find((p) => p.uuid === planUuid);
			const planName = plan?.plan_name ?? planUuid ?? "Unknown";
			const planetNaturalId = plan?.planet_natural_id ?? "";

			for (const building of planResult.production.buildings) {
				for (const recipe of building.activeRecipes) {
					if (
						recipe.cogm?.outputCOGM == null ||
						recipe.cogm.visible !== true
					)
						continue;

					for (const output of recipe.cogm.outputCOGM) {
						rawRows.push({
							key: `${planUuid}|${getCogmInputSignature(recipe.cogm)}|${output.ticker}`,
							row: {
								planUuid,
								planName,
								planetNaturalId,
								ticker: output.ticker,
								amount: output.amount,
								costSplit: output.costSplit,
								cogm: recipe.cogm,
							},
						});
					}
				}
			}
		}

		const grouped = new Map<string, IEmpireCOGMRow>();
		for (const r of rawRows) {
			const k = r.key;
			// First match wins: dedupe by plan+inputs+output and drop the rest.
			if (!grouped.has(k)) grouped.set(k, r.row);
		}
		return Array.from(grouped.values());
	});

	const empireCogmEnriched: Ref<IEmpireCOGMRow[]> = ref([]);
	watch(
		[empireCogm, selectedCXUuid],
		async () => {
			const base = empireCogm.value;
			const enriched: IEmpireCOGMRow[] = base.map((r) => ({
				...r,
				cxSellValue: null,
				sellMinusCogm: null,
			}));
			if (!selectedCXUuid.value || base.length === 0) {
				empireCogmEnriched.value = enriched;
				return;
			}
			const byPlanet = new Map<string, IEmpireCOGMRow[]>();
			for (const row of enriched) {
				const list = byPlanet.get(row.planetNaturalId) ?? [];
				list.push(row);
				byPlanet.set(row.planetNaturalId, list);
			}
			for (const [planetId, rows] of byPlanet) {
				const planetRef = ref(planetId);
				const { getPrice } = await usePrice(selectedCXUuid, planetRef);
				for (const row of rows) {
					const sell = await getPrice(row.ticker, "SELL");
					row.cxSellValue = sell;
					row.sellMinusCogm = sell - row.costSplit;
				}
			}
			empireCogmEnriched.value = enriched;
		},
		{ immediate: true, deep: true }
	);

	/**
	 * Holds computed empire options
	 *
	 * @author jplacht
	 */
	const empireOptions = computed(() =>
		refEmpireList.value.map((e) => {
			return {
				label: e.empire_name,
				value: e.uuid,
			};
		})
	);

	const mainContent = ref<"materialio" | "analysis" | "cogm">("materialio");

</script>

<template>
	<WrapperPlanningDataLoader
		empire-list
		load-c-x
		:empire-uuid="selectedEmpireUuid"
		@data:empire:plans="(value: IPlan[]) => (planData = value)"
		@update:empire-uuid="(value: string) => (selectedEmpireUuid = value)"
		@update:cx-uuid="
			(value: string | undefined) => (selectedCXUuid = value)
		"
		@data:empire:list="
			(value: IPlanEmpireElement[]) => (refEmpireList = value)
		">
		<template #default="{ empirePlanetList }">
			<WrapperGameDataLoader
				load-materials
				load-buildings
				load-recipes
				load-exchanges
				:load-planet-multiple="empirePlanetList"
				@complete="calculateEmpire">
				<AsyncWrapperGenericError
					v-if="refEmpireList.length === 0"
					message-title="No Empires"
					message-text="You don't have any empires. Head to Management to create your first." />

				<ComputingProgress
					v-else-if="isCalculating"
					:step="progressCurrent"
					:total="progressTotal"
					message="One does not simply calculate empire plans." />

				<div v-else>
					<div class="flex flex-col">
						<div
							class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
							<div class="flex flex-row gap-3">
								<h1 class="text-2xl font-bold my-auto">
									{{ empireName }}
								</h1>
								<PSpin v-if="isCalculating" />
							</div>
							<div class="gap-3 flex flex-row flex-wrap">
								<PButtonGroup>
									<PButton
										:type="
											mainContent === 'materialio'
												? 'primary'
												: 'secondary'
										"
										@click="mainContent = 'materialio'">
										Material I/O
									</PButton>
									<PButton
										:type="
											mainContent === 'analysis'
												? 'primary'
												: 'secondary'
										"
										@click="mainContent = 'analysis'">
										Analysis
									</PButton>
									<PButton
										:type="
											mainContent === 'cogm'
												? 'primary'
												: 'secondary'
										"
										@click="mainContent = 'cogm'">
										COGM
									</PButton>
								</PButtonGroup>
								<HelpDrawer file-name="empire" />
							</div>
						</div>

						<div
							class="grow grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-6 m-3 sm:m-6">
							<div
								class="flex flex-col gap-6 justify-items-start">
								<div>
									<PForm>
										<PFormItem label="Switch Empire">
											<PSelect
												v-model:value="
													selectedEmpireUuid
												"
												class="w-full"
												:options="empireOptions" />
										</PFormItem>
									</PForm>
								</div>
								<div>
									<AsyncEmpireCostOverview
										:cost-overview="costOverview" />
								</div>
								<div class="flex flex-col gap-6">
									<div class="overflow-x-auto">
										<Suspense>
											<AsyncEmpirePlanList
												:plan-list-data="
													planListData
												" />
											<template #fallback>
												<RenderingProgress
													:height="200" />
											</template>
										</Suspense>
									</div>
									<div>
										<Suspense v-if="selectedEmpire">
											<AsyncEmpireConfiguration
												:data="selectedEmpire"
												@reload:empires="
													reloadEmpires
												" />
											<template #fallback>
												<RenderingProgress
													:height="200" />
											</template>
										</Suspense>
									</div>
								</div>
							</div>
							<div class="overflow-x-auto">
								<EmpireMaterialIOFiltered
									:content="mainContent"
									:empire-material-i-o="
										combinedEmpireMaterialIO
									"
									:empire-cogm="empireCogmEnriched"
									:plan-list-data="planListData"
									:cx-uuid="selectedCXUuid" />
							</div>
						</div>
					</div>
				</div>
			</WrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
