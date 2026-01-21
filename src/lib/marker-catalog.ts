export type MarkerId = "moto-1" | "moto-2" | "coche-1" | "coche-2";

export const MARKER_STORAGE_KEY = "markerId";

export const MARKERS: Record<
  MarkerId,
  { label: string; category: "moto" | "coche"; source: any }
> = {
  "moto-1": {
    label: "Moto 1",
    category: "moto",
    source: require("../../assets/images/markers/motos/moto-1.png"),
  },
  "moto-2": {
    label: "Moto 2",
    category: "moto",
    source: require("../../assets/images/markers/motos/moto-2.png"),
  },
  "coche-1": {
    label: "Coche 1",
    category: "coche",
    source: require("../../assets/images/markers/coches/coche-1.png"),
  },
  "coche-2": {
    label: "Coche 2",
    category: "coche",
    source: require("../../assets/images/markers/coches/coche-2.png"),
  },
};

export const DEFAULT_MARKER_ID: MarkerId = "moto-1";
