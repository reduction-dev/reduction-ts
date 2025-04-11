import { create } from "@bufbuild/protobuf";
import { Int32VarSchema, StringVarSchema, type Int32Var, type StringVar } from "../proto/jobconfigpb/resolvable_pb";

// The currently supported config values types.
type VarTypes = string | number;

/**
 * ConfigVar is a configuration variable that can be a static value or a
 * parameter that will be resolved at runtime.
 */
export type ConfigVar<T extends VarTypes> = T | ConfigParam;

/**
 * ConfigParam is a job configuration parameter that the Reduction job will
 * resolve at runtime.
 */
export class ConfigParam {
  public key: string;
  private constructor(key: string) {
    this.key = key;
  }

  static of(key: string): ConfigParam {
    return new ConfigParam(key);
  }
}

/**
 * Convert a ConfigVar to its Int32Var protobuf representation.
 * @internal
 */
export function int32VarProto(configVar: ConfigVar<number> | undefined): Int32Var | undefined {
  if (configVar === undefined) {
    return undefined;
  }

  if (configVar instanceof ConfigParam) {
    return create(Int32VarSchema, {
      kind: {
        case: "param",
        value: configVar.key,
      }
    });
  } else {
    return create(Int32VarSchema, {
      kind: {
        case: "value",
        value: configVar,
      },
    });
  }
}

/**
 * Convert a ConfigVar to its StringVar protobuf representation.
 */
export function stringVarProto(configVar: ConfigVar<string> | undefined): StringVar | undefined {
  if (configVar === undefined) {
    return undefined;
  }

  if (configVar instanceof ConfigParam) {
    return create(StringVarSchema, {
      kind: {
        case: "param",
        value: configVar.key,
      }
    });
  } else {
    return create(StringVarSchema, {
      kind: {
        case: "value",
        value: configVar,
      },
    });
  }
}
