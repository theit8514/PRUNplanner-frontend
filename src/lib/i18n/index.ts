import { createI18n } from "vue-i18n";

import en_US from "@/locales/en_US.json";
import { PSelectOption } from "@/ui/ui.types";

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
	"zh_CN",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SupportedLanguages: PSelectOption[] = [
	{
		label: "EN",
		value: "en_US",
	},
	{
		label: "DE",
		value: "de_DE",
	},
	{
		label: "ES",
		value: "es_ES",
	},
	{
		label: "FR",
		value: "fr_FR",
	},
	{
		label: "IT",
		value: "it_IT",
	},
	{
		label: "JP",
		value: "ja_JP",
	},
	{
		label: "KR",
		value: "ko_KR",
	},
	{
		label: "NL",
		value: "nl_NL",
	},
	{
		label: "PT",
		value: "pt_PT",
	},
	{
		label: "CN",
		value: "zh_CN",
	},
];

export const locales = import.meta.glob("@/locales/*.json");

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
