import { createI18n } from "vue-i18n";

import { PSelectOption } from "@/ui/ui.types";

// eager load all en_US as initial version + message object
const enModules = import.meta.glob("@/locales/en_US/*.json", { eager: true });
const en_US = Object.entries(enModules).reduce(
	(acc, [path, module]) => {
		const key = path.split("/").pop()?.replace(".json", "");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (key) acc[key] = (module as any).default;
		return acc;
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{} as Record<string, any>
);

export const localeLazyLoaders = import.meta.glob("@/locales/**/*.json");

export type MessageSchema = typeof en_US;

export const SUPPORTED_LOCALES = [
	"de_DE",
	"en_US",
	"es_ES",
	"fr_FR",
	"it_IT",
	"ja_JP",
	"ko_KR",
	"nl_NL",
	"pt_PT",
	"ru_RU",
	"zh_CN",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SupportedLanguages: PSelectOption[] = [
	{
		label: "English",
		value: "en_US",
	},
	{
		label: "Deutsch",
		value: "de_DE",
	},
	{
		label: "Español",
		value: "es_ES",
	},
	{
		label: "Français",
		value: "fr_FR",
	},
	{
		label: "Italiano",
		value: "it_IT",
	},
	{
		label: "日本",
		value: "ja_JP",
	},
	{
		label: "한국어",
		value: "ko_KR",
	},
	{
		label: "Nederlands",
		value: "nl_NL",
	},
	{
		label: "Português",
		value: "pt_PT",
	},
	{
		label: "Русский",
		value: "ru_RU",
	},
	{
		label: "简体中文",
		value: "zh_CN",
	},
];

export const i18n = createI18n<{ message: MessageSchema }, SupportedLocale>({
	legacy: false,
	locale: "en_US",
	fallbackLocale: "en_US",
	messages: { en_US: en_US } as unknown as Record<
		SupportedLocale,
		MessageSchema
	>,
	globalInjection: true,
});
