import { randomHumanId } from "../storage/human-id/human-readable-id.js"
import { randomId } from "./randomId.js"
import {
	LanguageTag,
	MessageBundle,
	MessageBundleWithSlots,
	Message,
	MessageSlot,
	Text,
	Variant,
} from "./types.js"

/**
 * create v2 MessageBundle with a random human ID
 * @example createMessageBundle({
 *   messages: [
 * 		 createMessage({locale: "en", text: "Hello world!"})
 * 		 createMessage({locale: "de", text: "Hallo Welt!"})
 *   ]
 * })
 */
export function createMessageBundle(args: {
	id?: string
	messages: Message[]
	alias?: MessageBundle["alias"]
}): MessageBundle {
	return {
		id: args.id ?? randomHumanId(),
		alias: args.alias ?? {},
		messages: args.messages,
	}
}

/**
 * create v2 Messsage AST with a randomId, and text-only pattern
 * @example createMessage({locale: "en", text: "Hello world"})
 */
export function createMessage(args: {
	locale: LanguageTag
	text: string
	match?: Array<string>
}): Message {
	return {
		id: randomId(),
		locale: args.locale,
		declarations: [],
		selectors: [],
		variants: [createVariant({ text: args.text, match: args.match })],
	}
}

/**
 * create v2 Variant AST with text-only pattern
 * @example createVariant({match: ["*"], text: "Hello world"})
 */
export function createVariant(args: {
	id?: string
	text?: string
	match?: Array<string>
}): Variant {
	return {
		id: args.id ? args.id : randomId(),
		match: args.match ? args.match : [],
		pattern: [toTextElement(args.text ?? "")],
	}
}

export function toTextElement(text: string): Text {
	return {
		type: "text",
		value: text,
	}
}

// ****************************
// WIP experimental persistence
// ****************************

/**
 * create MessageSlot for a locale (only used for persistence)
 */
export function createMessageSlot(locale: LanguageTag): MessageSlot {
	return {
		locale,
		slot: true,
	}
}

/**
 * return structuredClone with message slots for all locales not yet present
 */
export function addSlots(messageBundle: MessageBundle, locales: string[]): MessageBundleWithSlots {
	const bundle = structuredClone(messageBundle) as MessageBundleWithSlots
	bundle.messages = locales.map((locale) => {
		return bundle.messages.find((message) => message.locale === locale) ?? createMessageSlot(locale)
	})
	return bundle
}

/**
 * remove empty message slots without first creating a structured clone
 */
export function removeSlots(messageBundle: MessageBundleWithSlots) {
	messageBundle.messages = messageBundle.messages.filter((message) => !("slot" in message))
	return messageBundle as MessageBundle
}

/**
 * Add newlines between bundles and messages to avoid merge conflicts
 */
export function injectJSONNewlines(json: string): string {
	return json
		.replace(/\{"id":"/g, '\n\n\n\n{"id":"')
		.replace(/"messages":\[\{"locale":"/g, '"messages":[\n\n\n\n{"locale":"')
		.replace(/\}\]\}\]\},\{"locale":"/g, '}]}]},\n\n\n\n{"locale":"')
		.replace(/"slot":true\},\{"locale":/g, '"slot":true},\n\n\n\n{"locale":')
}
