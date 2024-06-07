import { hash } from "./hash.js"
import { HasId } from "../types/HasId.js"
import { SlotFile } from "../types/SlotFile.js"

// Hash slot selection algorithm:
// For a storage the number of slots need to be defiend at the beginning.
// this value defines the number of slots per slot file.
//
// To reach a good distribution over slots possible values are
// - like 16 256 4096 65536 ...
//
// For this example we use 256 - so a slot file contains
//
// given a hash from a stringified json object:
// 4ce286da8574e34c76d23769fd1b2c6c532e1cbc4ffde58204f9fa3e37cc76f8
// ^^^															^^^
// 4096 Slots -> 3 characters
// extract slot index by the last n characters
// check if the slot is free in one of the available slot files (in alphabetic order)
// -> if a free slot is found, use it
// -> find the first free file name by going from left to right
// if non of the available slot files has a slot free on the slot index
// -
export function stringifySlotFile<DocType extends HasId>(
	slotFile: SlotFile<DocType>,
	slotCount: number
) {
	let slotFileContent = "[\n"
	for (let currentSlot = 0; currentSlot < slotCount; currentSlot += 1) {
		const slotfileEntry = slotFile.recordSlots[currentSlot]
		if (!slotfileEntry) {
			slotFileContent += "null,"
		} else {
			const soltFileEntryString = JSON.stringify(slotfileEntry.data)
			const slotFileEntyHash = hash(soltFileEntryString)

			slotFileContent +=
				'{"hash":"' +
				slotFileEntyHash +
				'", "data": ' +
				soltFileEntryString +
				', "_deleted": ' +
				slotfileEntry._deleted +
				"},"
		}

		slotFileContent += "\n\n\n\n"
	}
	slotFileContent += "null]"
	return slotFileContent
}
