<script setup lang="ts">
	import { computed, PropType, ref, Ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n({ useScope: "global" });

	import { PButton } from "@/ui";
	import { NDrawer, NDrawerContent } from "naive-ui";
	import { VueShowdown } from "vue-showdown";

	const showDrawer: Ref<boolean> = ref(false);

	async function loadMarkdown(): Promise<string> {
		const markdownFiles = import.meta.glob("@/assets/help/*.md", {
			query: "?raw",
			import: "default",
		}) as Record<string, () => Promise<string>>;

		const path = `/src/assets/help/${props.fileName}.md`;
		const loader = markdownFiles[path];
		if (!loader)
			throw new Error(`Markdown file "${props.fileName}" not found.`);
		return await loader();
	}

	const markdownContent = ref("");

	const props = defineProps({
		fileName: {
			type: String,
			required: true,
		},
		drawerTitle: {
			type: String,
			required: false,
			default: undefined,
		},
		buttonTitle: {
			type: String,
			required: false,
			default: undefined,
		},
		buttonSize: {
			type: String as PropType<"sm" | "md">,
			required: false,
			default: "md",
		},
		buttonClass: {
			type: String,
			required: false,
			default: "",
		},
		drawerWidth: {
			type: Number,
			required: false,
			default: 600,
		},
	});

	watch(showDrawer, async () => {
		if (showDrawer.value) {
			markdownContent.value = await loadMarkdown();
		}
	});

	const displayDrawerTitle = computed(
		() => props.drawerTitle ?? t("common.buttons.help")
	);
	const displayButtonTitle = computed(
		() => props.buttonTitle ?? t("common.buttons.help")
	);
</script>

<template>
	<PButton
		:size="buttonSize"
		:class="buttonClass"
		type="secondary"
		@click="() => (showDrawer = !showDrawer)">
		{{ displayButtonTitle }}
	</PButton>
	<n-drawer v-model:show="showDrawer" :width="drawerWidth" placement="right">
		<n-drawer-content closable>
			<template #header>
				{{ displayDrawerTitle }}
			</template>
			<div v-if="markdownContent != ''" id="markdown">
				<VueShowdown :markdown="markdownContent" />
			</div>
			<div v-else class="text-center text-red-500">
				Unable to load '{{ fileName }}'
			</div>
		</n-drawer-content>
	</n-drawer>
</template>
