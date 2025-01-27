import { constants } from '@keymanapp/ldml-keyboard-constants';
import { KMXPlus } from '@keymanapp/common-types';
import { CompilerMessages } from './messages.js';
import { SectionCompiler } from "./section-compiler.js";
import { translateLayerAttrToModifier, validModifier } from '../util/util.js';


import GlobalSections = KMXPlus.GlobalSections;
import Layr = KMXPlus.Layr;
import LayrEntry = KMXPlus.LayrEntry;
import LayrList = KMXPlus.LayrList;
import LayrRow = KMXPlus.LayrRow;

export class LayrCompiler extends SectionCompiler {

  public get id() {
    return constants.section.layr;
  }

  public validate() {
    let valid = true;
    if (!this.keyboard.layers?.[0]?.layer?.length) {
      valid = false;
      this.callbacks.reportMessage(CompilerMessages.Error_MustBeAtLeastOneLayerElement());
    }
    let hardwareLayers = 0;
    this.keyboard.layers.forEach((layers) => {
      const { hardware, form } = layers;
      // TODO-LDML: in the future >1 hardware layer may be allowed, check for duplicates
      if (form === 'touch') {
        if (hardware) {
          valid = false;
          this.callbacks.reportMessage(CompilerMessages.Error_NoHardwareOnTouch({hardware}));
        }
      } else if (form === 'hardware') {
        hardwareLayers++;
        if (!hardware) {
          valid = false;
          this.callbacks.reportMessage(CompilerMessages.Error_MissingHardware());
        } else if (!constants.layr_list_hardware_map.get(hardware)) {
          valid = false;
          this.callbacks.reportMessage(CompilerMessages.Error_InvalidHardware({hardware}));
        } else if (hardwareLayers > 1) { // TODO-LDML: revisit if spec changes
          valid = false;
          this.callbacks.reportMessage(CompilerMessages.Error_MustHaveAtMostOneLayersElementPerForm({ form }));
        }
      } else {
        /* c8 ignore next 7 */
        // Should not be reached due to XML validation.
        valid = false;
        this.callbacks.reportMessage(CompilerMessages.Error_InvalidFile({
          errorText: `INTERNAL ERROR: Invalid XML: Invalid form="${form}" on layers element`
        }));
      }
      layers.layer.forEach((layer) => {
        const { modifier, id } = layer;
        if (!validModifier(modifier)) {
          this.callbacks.reportMessage(CompilerMessages.Error_InvalidModifier({ modifier, layer: id }));
          valid = false;
        }
      });
    });
    return valid;
  }

  public compile(sections: GlobalSections): Layr {
    const sect = new Layr();

    sect.lists = this.keyboard.layers.map((layers) => {
      const hardware = constants.layr_list_hardware_map.get(layers.hardware || 'touch');
      // Don't need to check 'form' because it is checked in validate
      const list: LayrList = {
        hardware,
        minDeviceWidth: layers.minDeviceWidth || 0,
        layers: layers.layer.map((layer) => {
          const entry: LayrEntry = {
            id: sections.strs.allocString(layer.id),
            mod: translateLayerAttrToModifier(layer),
            rows: layer.row.map((row) => {
              const erow: LayrRow = {
                keys: row.keys.split(' ').map((id) => sections.strs.allocString(id)),
              };
              return erow;
            }),
          };
          return entry;
        }),
      };
      return list;
    });
    return sect;
  }
}
