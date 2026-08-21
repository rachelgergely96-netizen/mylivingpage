"use client";

import { useContext } from "react";
import {
  MotionPreferenceContext,
  type MotionPreferenceContextValue,
} from "@/components/motion/MotionPreferenceProvider";

export function useMotionPreference(): MotionPreferenceContextValue {
  return useContext(MotionPreferenceContext);
}
