/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as electron from 'electron';
import { screen } from 'electron';
import * as env from '../env';
import si from "systeminformation";

export const getScreenSize = async () => {
  console.log(electron);
  let id = 0;
  let width = 0;
  let height = 0;
  let logicalSize = {
    width: 0,
    height: 0,
  }
  await si.graphics((e: any) => {
    console.log(e);
    const display = e.displays?.[0];
    width = display?.currentResX;
    height = display?.currentResY;
    id = display?.displayId;
    logicalSize = {
      width,
      height
    }
  });
  // const primaryDisplay = screen.getPrimaryDisplay();

  // const logicalSize = primaryDisplay.size; // Logical = Physical / scaleX
  // Mac retina display scaleFactor = 1
  // const scaleFactor = env.isMacOS ? 1 : primaryDisplay.scaleFactor;
  const scaleFactor = 1;
  const physicalSize = {
    width: Math.round(width * scaleFactor),
    height: Math.round(height * scaleFactor),
  };

  return {
    id,
    physicalSize,
    logicalSize,
    scaleFactor,
  };
};
