(() => {
  const canvas = document.getElementById('bg-canvas');
  const anchor = document.getElementById('wheel-anchor');
  const lockup = document.getElementById('lockup');
  const lockupText = document.getElementById('lockup-text');
  const mainContent = document.getElementById('main-content');
  
  if (!canvas || typeof THREE === 'undefined') return;

  // ─────────────────────────────────────────────────────────────
  // 1. Scene, Camera, Renderer
  // ─────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfceeda, 22.0, 48.0);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.005, 1000);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;

  let visibleHeight = 2 * 6 * Math.tan((camera.fov * Math.PI) / 360);
  let worldPerPixel = visibleHeight / window.innerHeight;

  // ─────────────────────────────────────────────────────────────
  // 2. Lighting
  // ─────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.4);
  scene.add(ambientLight);

  const keyLight = new THREE.PointLight(0xffffff, 2.0, 50);
  keyLight.position.set(4, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x2563eb, 2.4, 50);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
  rimLight.position.set(0, 4, -2);
  scene.add(rimLight);

  // Dedicated camera headlight so nav gear is brilliantly lit post-tunnel
  const cameraLight = new THREE.PointLight(0xffffff, 2.2, 40);
  cameraLight.position.set(1.5, 2.0, 1.5);
  camera.add(cameraLight);
  scene.add(camera);

    // ─────────────────────────────────────────────────────────────
  // 3. 3D Rotary Gear (Direct 3D Extrusion of Rotary SVG Emblem)
  // ─────────────────────────────────────────────────────────────
  const ROTARY_SVG_DATA = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\" width=\"1024\" height=\"1024\">\r\n  <path fill=\"#1296cc\" fill-rule=\"evenodd\" d=\"M 325.21 187.87 L 326.95 190.83 L 333.32 201.84 L 346.55 194.89 C 347.78 194.28 348.49 192.74 348.72 190.83 C 348.97 184.86 344.66 176.77 338.40 180.53 C 333.52 183.10 330.54 184.86 325.21 187.87 M 311.41 190.83 L 307.92 184.56 C 317.09 178.74 326.95 173.69 336.46 168.61 C 347.64 162.44 363.43 177.40 362.33 190.83 C 362.11 193.20 361.46 195.34 360.04 197.51 L 382.93 214.16 C 378.62 216.19 375.36 217.92 370.21 220.14 L 350.18 205.50 L 339.12 211.41 L 350.89 230.89 C 346.34 233.79 343.56 235.60 338.24 238.70 Z M 613.96 818.49 L 634.80 878.00 C 638.85 876.59 643.21 875.36 647.31 873.55 L 627.09 814.31 C 621.55 816.20 618.99 816.96 613.96 818.49 M 530.62 874.65 L 525.73 862.61 L 520.80 849.59 L 516.51 862.61 L 512.28 875.45 Z M 538.85 862.61 L 552.50 895.68 C 548.04 895.87 543.89 896.33 539.89 896.78 L 535.69 886.11 L 508.43 886.86 L 505.31 898.02 C 500.95 897.65 496.88 897.52 492.56 897.52 L 504.31 862.61 L 512.69 836.12 L 513.09 835.29 L 526.99 834.67 L 527.70 836.34 Z M 607.29 166.98 L 621.38 171.52 C 625.24 172.63 630.33 166.59 630.33 161.33 C 630.33 158.82 629.45 156.60 626.11 155.87 C 620.89 153.85 617.33 152.95 611.65 151.52 L 608.74 161.33 Z M 598.66 199.88 C 593.61 198.41 589.87 197.79 584.32 196.21 L 594.55 161.33 L 602.03 136.47 C 612.81 139.15 623.06 142.64 633.31 145.98 C 639.12 147.77 642.23 154.34 642.82 161.33 C 643.21 170.82 638.49 181.16 628.89 183.31 L 632.62 211.41 C 628.12 209.55 624.79 208.15 619.81 206.20 L 616.55 181.63 L 604.52 177.94 Z M 407.14 832.70 C 406.75 830.94 406.04 829.52 403.87 828.53 L 388.09 822.72 L 384.53 832.70 L 383.25 836.34 L 383.16 836.57 L 397.55 841.96 C 401.49 843.71 405.30 840.20 406.67 836.34 C 407.14 835.29 407.54 833.97 407.14 832.70 M 418.96 832.70 L 418.96 836.12 C 417.99 844.53 412.30 853.05 403.06 854.13 L 405.21 883.46 C 400.91 882.47 396.08 881.06 391.51 879.11 L 391.02 851.52 L 378.62 846.22 L 368.57 870.57 C 364.51 869.22 360.45 867.93 356.47 865.98 L 369.21 836.34 L 370.73 832.70 L 381.09 808.25 L 409.32 819.14 C 415.60 821.39 418.49 826.97 418.96 832.70 M 599.03 823.80 C 580.71 827.81 566.60 831.16 548.41 833.97 L 550.10 844.53 C 556.83 843.46 562.97 842.67 570.08 841.77 L 579.25 892.61 L 592.73 890.07 L 581.79 839.37 C 588.72 837.64 595.13 835.89 602.03 834.29 Z M 667.88 228.95 L 681.49 202.73 L 718.24 185.65 C 714.38 182.88 710.20 180.94 706.32 178.38 L 681.01 189.92 L 676.33 162.44 C 671.06 159.93 667.88 158.82 662.38 156.60 L 669.73 196.57 L 656.10 222.47 Z M 805.68 244.99 C 799.89 237.89 790.27 238.95 787.50 243.90 L 744.73 286.87 C 738.46 293.39 739.08 302.93 745.56 307.57 C 810.13 379.04 837.10 468.01 815.93 578.17 C 815.46 585.38 820.00 591.19 825.64 592.81 L 884.78 609.97 C 892.66 612.20 897.70 607.41 899.38 600.67 C 929.81 465.05 888.14 331.72 805.68 244.99 M 874.09 641.57 L 814.91 621.36 C 811.80 620.21 803.73 620.21 799.50 630.62 C 751.69 745.25 640.43 823.71 511.58 823.71 C 382.56 823.71 269.23 743.45 223.48 628.83 C 220.08 620.21 211.77 620.21 208.62 621.36 L 149.76 641.57 C 143.36 643.87 139.53 649.53 142.88 657.71 C 200.70 805.27 344.48 909.44 511.58 909.44 C 678.61 909.44 823.05 804.55 881.07 657.09 C 884.07 649.37 880.44 643.87 874.09 641.57 M 140.10 609.97 L 199.15 592.81 C 204.68 591.19 209.23 585.38 208.79 578.17 C 187.60 468.20 214.53 379.04 279.00 307.57 C 285.52 302.93 286.21 293.39 279.97 286.87 L 237.06 243.72 C 232.88 238.95 225.31 238.95 218.79 245.58 C 136.52 332.16 94.99 465.05 125.46 600.90 C 127.15 607.41 132.29 612.20 140.10 609.97 M 732.43 335.04 C 732.60 332.41 730.98 329.08 727.30 325.46 C 680.03 275.46 631.48 247.48 564.90 231.65 C 561.16 230.68 556.83 229.81 553.94 232.36 C 550.96 234.75 550.10 239.35 550.71 246.25 L 561.67 400.31 C 562.03 406.13 564.66 410.75 568.55 413.11 C 572.82 415.53 577.93 415.07 583.24 412.52 L 721.97 345.57 C 726.41 343.41 731.48 341.06 732.43 336.31 C 732.43 336.02 732.60 335.64 732.43 335.04 M 760.48 610.38 C 764.60 613.05 769.39 616.29 773.72 614.79 C 776.67 613.89 779.20 610.66 780.84 604.84 C 800.26 539.00 800.26 482.75 780.84 417.68 C 779.64 413.60 777.74 409.38 774.33 407.85 C 770.86 406.61 766.52 408.05 760.29 412.27 L 633.05 498.78 C 628.12 502.09 625.61 506.60 625.61 511.26 C 625.61 515.91 628.12 520.42 633.05 523.68 Z M 553.57 789.41 C 555.91 791.27 559.76 791.81 565.68 790.33 C 631.87 774.44 680.41 746.39 727.72 696.75 C 730.53 693.48 733.64 690.11 732.71 686.39 C 731.85 682.81 728.80 679.57 722.35 676.53 L 583.58 609.19 C 578.32 606.71 573.20 606.71 568.97 608.93 C 564.90 611.49 562.41 615.86 562.03 621.94 L 550.81 775.55 C 550.71 780.59 550.10 786.32 553.57 789.41 M 511.58 611.49 C 566.36 611.49 610.91 567.02 610.91 512.23 C 610.91 457.45 566.36 412.92 511.58 412.72 C 456.81 412.72 412.30 457.45 412.30 512.23 C 412.30 567.02 456.81 611.49 511.58 611.49 M 293.33 688.96 C 293.33 691.58 295.12 694.86 298.46 698.35 C 346.18 748.54 394.49 776.46 460.84 792.04 C 465.09 793.32 469.25 793.95 472.19 791.65 C 475.19 789.41 476.05 784.81 475.55 777.54 C 475.55 777.32 464.26 623.52 464.26 623.52 C 463.78 617.68 461.58 613.24 457.50 610.90 C 453.35 608.47 448.21 608.47 442.67 610.98 L 304.27 678.36 C 299.45 680.61 294.20 683.15 293.49 687.68 C 293.49 687.97 293.33 688.57 293.33 688.96 M 291.32 337.49 C 291.90 342.13 297.18 344.50 301.79 346.66 L 440.34 413.98 C 445.85 416.61 450.97 416.61 455.14 414.43 C 459.05 411.88 461.58 407.44 461.93 401.55 L 473.13 247.86 C 473.73 240.42 472.69 236.08 470.00 233.79 C 467.09 231.27 462.75 231.99 458.58 232.75 C 392.17 248.72 343.77 276.78 296.08 326.53 C 292.23 330.89 290.44 334.54 291.32 337.49 M 263.50 413.29 C 258.97 410.36 254.14 407.01 250.20 408.77 C 246.99 409.74 244.65 413.11 242.96 418.58 C 223.70 484.65 223.70 540.69 242.96 605.92 C 244.27 610.16 245.73 614.39 249.60 615.47 C 252.76 616.78 257.42 615.47 263.50 611.27 L 390.63 524.65 C 395.36 521.48 398.23 516.98 398.23 512.44 C 398.23 507.52 395.36 503.19 390.63 499.87 Z M 260.71 220.89 L 301.79 266.64 C 307.53 272.81 313.84 272.05 322.14 265.56 C 374.04 224.86 440.62 200.77 511.58 200.77 C 582.59 200.77 649.23 224.77 701.62 265.56 C 709.82 271.62 715.95 272.81 721.97 266.64 L 763.06 220.89 C 767.71 215.84 767.71 208.86 758.79 201.41 C 689.91 147.77 604.89 114.67 511.40 114.67 C 418.49 114.67 332.24 147.77 264.58 201.65 C 255.73 208.86 256.12 215.84 260.71 220.89 M 1011.94 512.61 C 1011.94 518.43 1011.68 524.29 1011.03 528.96 L 1010.86 530.22 L 1009.52 530.92 C 988.26 543.57 960.79 550.77 933.24 551.53 C 932.58 555.02 929.59 579.90 929.08 583.40 C 954.77 590.81 979.67 604.84 997.04 622.79 L 997.74 623.91 L 997.74 625.05 C 996.38 634.84 992.91 647.98 989.07 656.51 L 988.62 657.84 L 987.37 658.05 C 963.29 664.99 934.91 664.72 908.65 658.23 C 907.41 661.49 897.70 684.61 896.71 687.97 C 919.72 702.51 940.07 722.50 951.51 743.84 L 952.11 745.03 L 951.74 746.28 C 948.14 754.77 941.43 767.06 935.41 774.44 L 934.76 775.55 L 933.24 775.55 C 908.65 775.84 881.19 768.54 857.23 755.20 C 855.05 758.06 839.05 779.20 836.88 782.05 C 855.76 801.50 870.08 826.15 875.88 850.47 L 876.26 851.74 L 875.56 852.63 C 870.08 860.07 859.99 869.93 852.67 875.84 L 851.82 876.59 L 850.00 876.24 C 826.35 869.93 801.35 855.61 781.92 836.83 C 779.03 839.00 759.20 854.50 756.25 856.71 C 768.95 879.96 776.67 906.73 776.67 930.91 L 776.67 934.27 L 775.19 935.11 C 767.88 941.00 755.71 948.04 747.04 951.59 L 746.17 951.96 L 744.73 951.49 C 723.43 939.09 703.04 918.87 689.09 895.68 C 685.72 897.18 661.58 907.50 658.28 908.94 C 661.58 921.86 663.54 935.37 663.91 948.72 C 663.91 962.20 661.58 975.68 658.28 987.86 L 658.11 989.07 L 656.81 989.78 C 648.74 993.14 635.11 996.51 625.61 998.17 L 624.16 998.38 L 623.34 997.35 C 605.00 979.91 590.96 955.10 583.58 929.18 C 580.32 929.42 555.30 932.82 551.78 933.55 C 551.34 960.73 543.89 988.30 530.94 1009.66 L 530.24 1010.78 L 528.77 1010.97 C 520.09 1012.29 506.18 1012.29 496.70 1010.97 L 495.54 1010.78 L 494.71 1009.66 C 482.18 988.30 474.68 960.73 474.09 933.55 C 470.35 933.19 444.00 929.42 440.34 929.18 C 433.13 954.94 418.96 979.61 401.12 997.27 L 400.16 998.17 L 398.68 997.95 C 388.90 996.51 376.05 992.75 367.44 989.18 L 366.40 988.67 L 365.97 987.57 C 362.33 975.43 360.45 961.81 360.45 948.33 C 360.45 935.11 362.33 921.86 365.69 908.94 C 362.33 907.50 339.53 898.27 336.25 896.78 C 322.14 920.36 301.79 940.84 280.30 952.78 L 279.17 953.43 L 277.79 953.06 C 268.90 949.09 257.18 942.36 249.60 936.67 L 248.67 935.74 L 248.67 933.19 C 248.67 908.71 256.12 881.75 268.90 858.18 C 266.07 855.99 244.81 839.83 241.89 837.64 C 222.41 856.42 197.61 870.57 173.65 876.70 L 172.41 877.09 L 171.10 876.24 C 163.77 870.32 154.34 860.80 148.41 853.32 L 147.61 852.02 L 147.97 850.76 C 154.34 826.59 168.69 801.93 187.34 782.75 C 185.22 779.86 169.12 759.00 166.85 755.88 C 143.14 769.17 115.42 776.85 90.84 776.22 L 89.53 776.22 L 88.68 775.37 C 82.93 767.77 76.05 755.62 72.35 747.00 L 71.79 745.71 L 72.35 744.57 C 84.73 722.89 104.96 702.90 128.05 689.04 C 126.55 685.49 116.71 662.20 115.05 658.92 C 88.79 665.46 60.25 665.65 36.23 658.92 L 35.06 658.55 L 34.35 657.47 C 31.12 649.37 27.55 635.74 26.08 626.14 L 25.82 624.65 L 26.69 623.52 C 44.16 605.71 68.71 591.61 94.99 583.83 C 94.70 580.16 90.84 553.68 90.45 550.02 C 63.03 549.65 35.45 542.57 14.00 529.83 L 12.93 529.13 L 12.83 527.64 C 12.22 523.19 12.07 517.38 12.07 511.48 C 12.07 505.73 12.22 500.08 12.83 495.27 L 12.93 493.80 L 14.00 493.21 C 35.45 480.56 63.03 473.25 90.45 472.83 C 91.03 469.21 94.28 443.48 94.70 440.00 C 68.71 432.56 43.91 418.33 26.30 400.58 L 25.57 399.71 L 25.82 398.34 C 26.95 388.43 30.69 375.21 34.35 367.00 L 34.77 365.81 L 36.06 365.44 C 59.77 358.45 88.46 358.65 114.83 365.11 C 116.30 361.91 125.91 338.70 127.37 335.20 C 104.09 321.12 83.65 301.09 71.49 279.45 L 70.89 278.07 L 71.49 276.78 C 75.31 268.10 82.18 256.34 87.58 248.96 L 88.46 247.86 L 89.94 247.86 C 114.83 247.48 142.27 255.10 165.95 268.22 C 168.17 265.56 184.31 243.72 186.52 240.81 C 167.72 221.24 153.50 196.71 147.36 172.40 L 147.10 171.36 L 147.61 170.28 C 153.63 162.75 163.59 152.95 170.89 147.21 L 172.05 146.49 L 173.15 146.70 C 197.61 152.95 222.27 167.51 241.47 186.18 C 244.27 183.96 263.50 169.14 266.35 166.98 C 253.12 143.83 245.73 116.85 245.73 92.87 L 245.73 89.25 L 246.95 88.42 C 254.14 82.78 266.35 75.78 275.05 72.24 L 275.97 71.66 L 277.43 72.30 C 298.84 84.41 318.99 104.69 333.09 127.90 C 336.46 126.62 361.46 115.76 364.88 114.39 C 361.62 101.46 359.58 88.06 359.78 74.77 C 359.78 60.97 361.46 47.82 365.09 35.70 L 365.27 34.20 L 366.58 33.86 C 374.64 30.48 388.09 26.85 397.55 25.41 L 399.07 25.21 L 400.16 26.16 C 417.99 43.51 432.21 68.35 439.72 94.55 C 443.36 94.17 469.65 90.86 473.16 90.22 C 473.73 63.25 481.11 35.70 494.00 14.29 L 494.55 13.17 L 495.90 12.80 C 505.31 11.69 519.17 11.69 528.28 12.80 L 529.49 13.17 L 530.24 14.29 C 543.21 35.70 550.71 63.25 550.71 89.97 C 554.65 90.86 580.32 94.17 583.98 94.55 C 591.65 68.35 605.76 43.70 623.71 26.28 L 624.52 25.41 L 625.72 25.77 C 635.50 26.85 648.74 30.48 657.24 34.20 L 658.28 34.61 L 658.70 36.09 C 662.38 48.10 664.14 61.18 664.14 74.77 C 663.91 88.18 661.96 101.70 658.70 114.67 C 661.96 116.00 686.93 126.43 690.40 127.90 C 704.23 104.69 724.14 84.57 745.79 72.30 L 747.04 71.66 L 748.33 72.24 C 756.91 75.88 768.91 82.78 776.29 88.58 L 777.38 89.25 L 777.38 92.63 C 777.38 117.22 769.76 144.08 756.91 166.98 C 759.67 169.14 780.29 185.26 783.38 187.64 C 802.80 168.77 827.49 154.34 851.82 148.36 L 852.90 147.77 L 853.96 148.90 C 861.28 154.34 871.16 164.61 876.75 171.97 L 877.78 173.06 L 877.36 174.30 C 871.16 198.62 856.51 223.30 837.85 242.61 C 840.03 245.58 855.54 266.03 857.93 268.97 C 882.12 255.96 909.47 248.51 934.26 248.96 L 935.41 248.96 L 936.21 250.05 C 942.23 257.75 949.13 269.68 952.50 277.88 L 953.30 279.45 L 952.50 280.65 C 940.18 302.10 919.94 321.99 896.71 336.16 C 898.13 339.68 907.57 362.99 909.37 366.25 C 935.41 359.69 964.04 359.55 987.75 366.25 L 989.16 366.53 L 989.71 367.90 C 993.02 376.14 996.88 389.53 998.13 399.37 L 998.33 400.58 L 997.36 401.55 C 979.95 419.59 955.15 433.71 929.08 441.08 C 929.59 444.67 932.84 470.11 933.46 473.72 C 960.90 474.32 988.26 481.66 1009.52 494.25 L 1010.86 495.05 L 1011.03 496.35 C 1011.68 500.98 1011.94 506.60 1011.94 512.61 M 731.85 748.54 L 757.89 776.61 L 714.18 763.71 C 710.54 766.48 708.10 767.44 704.88 770.25 L 742.92 821.39 C 746.17 818.86 749.52 815.79 752.56 813.19 L 729.48 782.42 L 773.63 795.73 C 776.67 793.09 781.00 790.12 783.97 786.39 L 739.94 739.82 C 737.59 742.37 734.88 745.71 731.85 748.54 M 701.62 823.33 C 701.62 819.57 700.66 816.20 698.86 812.96 C 693.64 803.23 681.27 800.10 671.63 805.64 C 664.83 809.28 661.37 816.20 661.37 823.33 C 661.58 826.59 662.38 830.24 664.29 833.32 C 664.83 834.29 665.48 835.29 666.45 836.34 C 672.52 843.57 683.20 845.26 691.40 840.48 C 693.64 839.37 695.45 837.90 696.90 836.34 C 699.92 832.70 701.62 827.81 701.62 823.33 M 708.71 807.68 C 711.39 812.36 712.69 817.80 712.90 823.33 C 712.90 827.66 711.98 832.10 710.20 836.12 C 707.27 841.96 702.93 847.18 696.90 850.66 C 682.20 859.25 663.18 854.13 654.27 839.00 C 653.95 838.15 653.55 837.19 652.96 836.12 C 651.17 832.10 650.30 827.66 649.92 823.33 C 650.30 812.20 655.73 801.93 665.70 796.14 C 680.64 787.68 699.92 792.74 708.71 807.68 M 774.50 724.00 L 781.92 735.73 L 788.71 747.56 L 797.86 735.73 L 800.26 732.80 Z M 767.38 709.66 L 829.97 730.23 C 828.52 732.08 827.35 733.87 826.02 735.73 C 824.94 737.14 823.63 738.57 822.77 740.40 L 811.80 736.45 L 794.72 757.80 L 800.96 767.58 C 798.41 770.49 795.54 773.64 792.28 776.85 L 767.49 735.73 L 758.32 720.58 Z M 836.72 700.40 L 790.74 675.07 L 784.84 685.67 L 840.03 716.47 L 861.28 678.36 L 851.82 673.28 Z M 473.13 833.32 L 468.54 871.59 L 450.16 829.62 C 445.85 828.77 443.16 827.66 438.83 826.97 L 424.39 888.87 C 428.85 890.07 433.13 890.55 437.74 891.34 L 445.46 853.32 L 464.10 895.68 C 468.33 896.33 473.13 897.65 478.04 897.52 L 484.95 833.58 C 481.33 833.38 477.02 833.97 473.13 833.32 M 470.99 139.03 L 476.53 190.31 L 489.99 188.90 L 484.72 138.00 L 505.10 136.74 L 504.31 125.32 C 481.57 126.62 472.19 127.54 449.68 130.91 L 451.19 141.75 Z M 533.38 166.98 C 540.21 167.30 546.56 168.07 552.97 168.98 L 549.60 155.87 L 545.37 142.37 L 539.02 155.87 Z M 522.97 188.30 C 517.71 188.26 515.28 188.26 510.12 188.26 L 525.73 155.87 L 539.89 126.43 L 553.94 127.90 L 561.32 155.87 L 571.52 193.46 C 566.80 192.58 563.13 191.87 558.66 191.60 L 555.03 179.82 C 545.76 178.38 537.37 177.94 528.77 177.56 Z M 392.56 172.82 C 393.41 183.96 403.30 192.10 414.02 191.17 C 424.62 190.09 432.53 181.63 432.53 170.98 C 432.90 170.45 432.53 169.85 432.53 169.14 C 431.60 157.93 421.96 150.07 410.78 151.12 C 400.16 151.91 392.17 160.32 392.56 170.98 Z M 381.09 173.93 L 381.09 170.98 C 380.77 154.77 393.20 141.42 409.51 140.12 C 426.77 138.44 442.10 151.12 443.56 168.48 L 443.56 170.98 C 443.56 187.16 431.33 201.00 414.73 202.52 C 397.97 204.01 382.56 191.38 381.09 173.93 M 512.69 572.18 C 545.37 572.18 572.26 545.33 572.26 512.61 C 572.26 485.43 553.34 461.79 527.32 455.29 C 526.99 452.62 526.28 440.19 526.28 440.19 L 496.23 440.19 C 496.23 440.19 495.54 453.69 495.29 456.37 C 470.35 463.94 453.53 486.68 453.53 512.61 C 453.53 545.33 480.39 572.18 512.69 572.18 M 511.58 601.81 C 462.31 601.81 422.06 561.39 422.06 512.23 C 422.06 462.73 462.31 422.52 511.58 422.52 C 561.16 422.52 601.03 462.73 601.03 512.23 C 601.03 561.61 560.96 601.81 511.58 601.81 M 335.25 796.86 C 343.77 801.50 352.12 806.34 361.46 810.76 L 367.05 801.50 C 354.13 794.82 342.00 787.19 331.13 779.66 L 295.48 831.97 C 309.00 840.92 321.36 848.41 335.25 856.42 L 341.00 847.18 L 312.24 830.24 L 321.95 816.59 L 341.00 828.05 L 346.55 819.14 C 340.43 815.79 334.06 811.90 327.37 807.82 Z M 263.97 719.26 L 234.66 744.57 L 249.60 701.17 C 246.95 697.45 245.73 694.86 242.96 691.44 L 190.45 727.08 C 192.80 730.61 195.67 733.87 198.16 737.50 L 229.74 715.62 L 214.93 759.35 C 217.49 762.25 220.08 766.67 223.70 769.62 L 272.30 727.94 C 269.59 725.06 266.35 722.50 263.97 719.26 M 229.26 668.80 L 175.17 700.40 C 177.10 704.18 179.18 708.63 181.55 712.28 L 235.76 680.61 C 233.11 675.83 231.62 673.28 229.26 668.80 M 296.08 767.22 L 262.74 806.77 L 252.36 797.76 L 286.82 759.35 C 281.36 754.29 277.19 749.75 271.90 745.03 L 279.58 737.33 C 292.70 749.75 304.27 759.35 318.76 771.03 L 312.10 779.52 C 306.83 775.37 301.40 771.41 296.08 767.22\" />\r\n</svg>";

  function buildSvgRotaryGeometry() {
    if (typeof THREE.SVGLoader === 'undefined') {
      console.warn('SVGLoader not loaded');
      return new THREE.CylinderGeometry(1, 1, 0.22, 24);
    }
    const loader = new THREE.SVGLoader();
    const svgData = loader.parse(ROTARY_SVG_DATA);
    const shapes = [];
    svgData.paths.forEach(path => {
      shapes.push(...THREE.SVGLoader.createShapes(path));
    });
    const extrudeSettings = {
      depth: 90,
      bevelEnabled: true,
      bevelThickness: 10,
      bevelSize: 6,
      bevelSegments: 2,
      curveSegments: 14
    };
    const geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
    geometry.center();
    const sf = 1 / 502;
    geometry.scale(sf, -sf, sf);
    geometry.computeVertexNormals();
    return geometry;
  }

  const gearGeometry = buildSvgRotaryGeometry();

  const gearMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a84d4,
    metalness: 0.45,
    roughness: 0.30,
    emissive: 0x063a66,
    emissiveIntensity: 0.18,
    flatShading: false,
    side: THREE.DoubleSide
  });

  const gearGroup = new THREE.Group();
  const gearMesh = new THREE.Mesh(gearGeometry, gearMaterial);
  gearGroup.add(gearMesh);
  scene.add(gearGroup);

  let gearHoleWorldX = 0;
  let gearHoleWorldY = 0;
  let baseGearWorldRadius = 1;

  // ─────────────────────────────────────────────────────────────
  // 4. Main Menu State
  // ─────────────────────────────────────────────────────────────
  let menuVisible = false;
  let inMenuColorsSet = false;

  // ─────────────────────────────────────────────────────────────
  // 5. Particle Field
  // ─────────────────────────────────────────────────────────────
  const PARTICLE_COUNT = 2400;
  const REST_PARTICLE_COUNT = 420;
  const particleGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const basePositions = new Float32Array(PARTICLE_COUNT * 3);
  const menuPositions = new Float32Array(PARTICLE_COUNT * 3);
  const mouseDisplacements = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const targetColors = new Float32Array(PARTICLE_COUNT * 3);

  const phaseX = new Float32Array(PARTICLE_COUNT);
  const phaseY = new Float32Array(PARTICLE_COUNT);
  const phaseZ = new Float32Array(PARTICLE_COUNT);
  const driftSpeed = new Float32Array(PARTICLE_COUNT);

  const normX = new Float32Array(PARTICLE_COUNT);
  const normY = new Float32Array(PARTICLE_COUNT);
  const normZ = new Float32Array(PARTICLE_COUNT);

  const TUNNEL_SPAN = 58.0;
  const tunnelBaseZ = new Float32Array(PARTICLE_COUNT);
  const tunnelAngle = new Float32Array(PARTICLE_COUNT);
  const tunnelRadius = new Float32Array(PARTICLE_COUNT);

  function configureBeaconParticle(pIdx, slotIndex) {
    if (pIdx >= PARTICLE_COUNT) return;
    tunnelBaseZ[pIdx] = 14.0 + slotIndex * 5.2;
    tunnelRadius[pIdx] = 0.74;

    if (slotIndex % 4 === 0) tunnelAngle[pIdx] = Math.PI;
    else if (slotIndex % 4 === 1) tunnelAngle[pIdx] = 0.0;
    else if (slotIndex % 4 === 2) tunnelAngle[pIdx] = Math.PI / 2;
    else tunnelAngle[pIdx] = -Math.PI / 2;

    const p3 = pIdx * 3;
    if (slotIndex % 2 === 0) {
      targetColors[p3] = 0.12; targetColors[p3 + 1] = 0.58; targetColors[p3 + 2] = 0.98;
    } else {
      targetColors[p3] = 0.96; targetColors[p3 + 1] = 0.72; targetColors[p3 + 2] = 0.18;
    }
  }

  const colorPalette = [
    new THREE.Color('#1c85d7'),
    new THREE.Color('#388ec9'),
    new THREE.Color('#2563eb'),
    new THREE.Color('#4d88b4'),
    new THREE.Color('#78a8ca'),
    new THREE.Color('#9bbecf'),
    new THREE.Color('#d4b693'),
    new THREE.Color('#e2a85c')
  ];
  const bgColor = new THREE.Color('#fceeda');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    if (i < REST_PARTICLE_COUNT) {
      normX[i] = Math.random() - 0.5;
      normY[i] = Math.random() - 0.5;
      const z = -4.5 + Math.random() * 7.5;
      normZ[i] = z;
    } else {
      normX[i] = (Math.random() - 0.5) * 0.18;
      normY[i] = (Math.random() - 0.5) * 0.18;
      normZ[i] = -0.5 - Math.random() * 8.0;
    }

    phaseX[i] = Math.random() * Math.PI * 2;
    phaseY[i] = Math.random() * Math.PI * 2;
    phaseZ[i] = Math.random() * Math.PI * 2;
    driftSpeed[i] = 0.25 + Math.random() * 0.35;

    const u = i / PARTICLE_COUNT;
    tunnelBaseZ[i] = u * TUNNEL_SPAN + (Math.random() - 0.5) * 0.40;
    tunnelAngle[i] = Math.random() * Math.PI * 2;

    const shellDepth = Math.random() * 0.26 + (Math.random() - 0.5) * 0.04;
    tunnelRadius[i] = 0.68 + Math.max(0, shellDepth);

    const dist = 6.0 - normZ[i];
    const visHeightAtZ = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    const visWidthAtZ = visHeightAtZ * camera.aspect;

    const x = normX[i] * visWidthAtZ * 1.15;
    const y = normY[i] * visHeightAtZ * 1.15;
    const z = normZ[i];

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;

    // Pre-calculate main menu dispersed constellation positions (centered around post-tunnel camera Z = -50.15)
    const TUNNEL_TRAVEL_DIST_INIT = 52.0;
    const menuCamZInit = -0.15 - TUNNEL_TRAVEL_DIST_INIT + 2.0; // -50.15
    const menuDistInit = 1.8 + Math.random() * 16.0;
    const menuVisHInit = 2 * menuDistInit * Math.tan((camera.fov * Math.PI) / 360);
    const menuVisWInit = menuVisHInit * camera.aspect;
    menuPositions[i3]     = (Math.random() - 0.5) * menuVisWInit * 1.35;
    menuPositions[i3 + 1] = (Math.random() - 0.5) * menuVisHInit * 1.35;
    menuPositions[i3 + 2] = menuCamZInit - menuDistInit;

    mouseDisplacements[i3] = 0;
    mouseDisplacements[i3 + 1] = 0;
    mouseDisplacements[i3 + 2] = 0;

    const depthFactor = (z + 4.5) / 7.5;
    const chosenColor = colorPalette[Math.floor(Math.random() * colorPalette.length)].clone();
    chosenColor.lerp(bgColor, (1 - depthFactor) * 0.35);

    targetColors[i3] = chosenColor.r;
    targetColors[i3 + 1] = chosenColor.g;
    targetColors[i3 + 2] = chosenColor.b;

    if (i === 35 || i === 140 || i === 290 || i === 480) {
      targetColors[i3] = 0.12; targetColors[i3 + 1] = 0.58; targetColors[i3 + 2] = 0.98;
    } else if (i === 80 || i === 210 || i === 380 || i === 580) {
      targetColors[i3] = 0.96; targetColors[i3 + 1] = 0.72; targetColors[i3 + 2] = 0.18;
    }

    if (i < REST_PARTICLE_COUNT) {
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;
    } else {
      colors[i3] = bgColor.r;
      colors[i3 + 1] = bgColor.g;
      colors[i3 + 2] = bgColor.b;
    }
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setDrawRange(0, REST_PARTICLE_COUNT);

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.040,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  particleSystem.frustumCulled = false;
  scene.add(particleSystem);

  // ─────────────────────────────────────────────────────────────
  // 5b. Constellation chains + sparks
  // ─────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  const MAX_CHAIN_SEGMENTS = 14;
  const linePositions = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);
  const lineColors = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.90, depthWrite: false });
  const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  lineMesh.frustumCulled = false;
  scene.add(lineMesh);

  const MAX_SPARKS = 16;
  const sparkPositions = new Float32Array(MAX_SPARKS * 3);
  const sparkColors = new Float32Array(MAX_SPARKS * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
  const sparkMaterial = new THREE.PointsMaterial({ size: 0.088, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial);
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);

  const activeChain = { nodes: [], startTime: 0, segmentDuration: 0.85, segmentDelay: 0.22, totalDuration: 0, nextPickTime: 0.4 };

  function triggerChain(startParticle, targetNodes = 4, isClick = false) {
    const posArr = particleGeometry.attributes.position.array;
    const connectMaxDistSq = 1.35 * 1.35;
    const pool = REST_PARTICLE_COUNT;
    const chainNodes = [startParticle];
    const used = new Set([startParticle]);

    for (let step = 0; step < targetNodes - 1; step++) {
      const curr = chainNodes[chainNodes.length - 1];
      const curr3 = curr * 3;
      const cx = posArr[curr3], cy = posArr[curr3 + 1], cz = posArr[curr3 + 2];
      let bestNeighbor = -1, bestDistSq = connectMaxDistSq;

      for (let cand = 0; cand < pool; cand++) {
        if (used.has(cand)) continue;
        const cand3 = cand * 3;
        const dx = cx - posArr[cand3];
        const dy = cy - posArr[cand3 + 1];
        const dz = (cz - posArr[cand3 + 2]) * 0.55;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < bestDistSq && dSq > 0.0001) { bestDistSq = dSq; bestNeighbor = cand; }
      }

      if (bestNeighbor !== -1) { chainNodes.push(bestNeighbor); used.add(bestNeighbor); }
      else break;
    }

    if (chainNodes.length >= 2) {
      activeChain.nodes = chainNodes;
      activeChain.startTime = clock.getElapsedTime();
      activeChain.segmentDuration = isClick ? 0.60 : 0.85;
      activeChain.segmentDelay = isClick ? 0.10 : 0.22;
      const numSegs = chainNodes.length - 1;
      activeChain.totalDuration = (numSegs - 1) * activeChain.segmentDelay + activeChain.segmentDuration;
      activeChain.nextPickTime = clock.getElapsedTime() + activeChain.totalDuration + (isClick ? 1.0 : (0.8 + Math.random() * 0.7));
      return true;
    }
    return false;
  }

  function updateParticleBounds() {
    for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const z = normZ[i];
      const dist = 6.0 - z;
      const visHeightAtZ = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
      const visWidthAtZ = visHeightAtZ * camera.aspect;
      basePositions[i3] = normX[i] * visWidthAtZ * 1.15;
      basePositions[i3 + 1] = normY[i] * visHeightAtZ * 1.15;
      basePositions[i3 + 2] = z;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Align intro gear to DOM anchor
  // ─────────────────────────────────────────────────────────────
  function updateGearTransform() {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    gearHoleWorldX = (centerX - window.innerWidth / 2) * worldPerPixel;
    gearHoleWorldY = -(centerY - window.innerHeight / 2) * worldPerPixel;
    baseGearWorldRadius = (rect.width / 2) * worldPerPixel;

    gearGroup.position.set(gearHoleWorldX, gearHoleWorldY, 0);
    gearGroup.scale.set(baseGearWorldRadius, baseGearWorldRadius, baseGearWorldRadius);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Scroll & Nav Interaction
  // ─────────────────────────────────────────────────────────────
  let targetScrollProg = 0;
  let smoothScrollProg = 0;
  if (window.location.hash === '#menu') {
    targetScrollProg = 1.0;
    smoothScrollProg = 1.0;
    menuVisible = true;
    if (mainContent) mainContent.classList.add('visible');
  }

  // Tunnel scroll (home screen → tunnel)
  window.addEventListener('wheel', (e) => {
    if (menuVisible) {
      const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      if (deltaY < -10) {
        // Reverse scroll UP exits back into the tunnel
        targetScrollProg = Math.max(0, targetScrollProg - 0.05);
        if (targetScrollProg < 0.96) {
          menuVisible = false;
          if (mainContent) mainContent.classList.remove('visible');
        }
      }
      return;
    }

    const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
    const deltaX = e.deltaMode === 1 ? e.deltaX * 24 : e.deltaX;
    const rawDelta = deltaY + deltaX;
    const absDelta = Math.abs(rawDelta);
    if (absDelta > 0.4) {
      const stepMag = Math.min(0.032, Math.max(0.006, absDelta * 0.00032));
      const step = Math.sign(rawDelta) * stepMag;
      targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + step));
    }
  }, { passive: true });

  // Touch
  let touchStartY = 0, touchStartX = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const dy = touchStartY - e.touches[0].clientY;
      const dx = touchStartX - e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      if (menuVisible) {
        if (dy < -10) {
          targetScrollProg = Math.max(0, targetScrollProg - 0.05);
          if (targetScrollProg < 0.96) {
            menuVisible = false;
            if (mainContent) mainContent.classList.remove('visible');
          }
        }
        return;
      }

      const rawTouchDelta = dy + dx;
      const absTouch = Math.abs(rawTouchDelta);
      if (absTouch > 0.5) {
        const touchStep = Math.sign(rawTouchDelta) * Math.min(0.035, Math.max(0.005, absTouch * 0.0025));
        targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + touchStep));
      }
    }
  }, { passive: true });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (menuVisible) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        targetScrollProg = Math.max(0, targetScrollProg - 0.05);
        if (targetScrollProg < 0.96) {
          menuVisible = false;
          if (mainContent) mainContent.classList.remove('visible');
        }
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      targetScrollProg = Math.min(1.0, targetScrollProg + 0.04);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      targetScrollProg = Math.max(0.0, targetScrollProg - 0.04);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Mouse Tracking
  // ─────────────────────────────────────────────────────────────
  const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0, isHovered: false, clientX: 0, clientY: 0 };
  const raycaster = new THREE.Raycaster();
  const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const planeIntersect = new THREE.Vector3();

  function onPointerMove(e) {
    mouse.isHovered = true;
    mouse.clientX = e.clientX;
    mouse.clientY = e.clientY;
    mouse.screenX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.screenY = -(e.clientY / window.innerHeight) * 2 + 1;

    if (smoothScrollProg < 0.10 && camera.position.z > 0.5) {
      raycaster.setFromCamera(new THREE.Vector2(mouse.screenX, mouse.screenY), camera);
      raycaster.ray.intersectPlane(mousePlane, planeIntersect);
      if (planeIntersect && isFinite(planeIntersect.x)) {
        mouse.worldX = planeIntersect.x;
        mouse.worldY = planeIntersect.y;
      }
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', () => {
    mouse.isHovered = false;
  });

  // Click on a particle
  const clickProjectVec = new THREE.Vector3();
  window.addEventListener('click', (e) => {
    
    if (smoothScrollProg > 0.15) return;
    if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a, button'))) return;

    const posArr = particleGeometry.attributes.position.array;
    const pool = REST_PARTICLE_COUNT;
    let closestIndex = -1, closestDistSq = Infinity;
    const maxClickSq = 130 * 130;

    for (let i = 0; i < pool; i++) {
      const i3 = i * 3;
      clickProjectVec.set(posArr[i3], posArr[i3 + 1], posArr[i3 + 2]);
      clickProjectVec.project(camera);
      const sx = (clickProjectVec.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-clickProjectVec.y * 0.5 + 0.5) * window.innerHeight;
      const dx = sx - e.clientX, dy = sy - e.clientY;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDistSq) { closestDistSq = dSq; closestIndex = i; }
    }

    if (closestIndex !== -1 && closestDistSq <= maxClickSq) {
      triggerChain(closestIndex, 8 + Math.floor(Math.random() * 4), true);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Resize
  // ─────────────────────────────────────────────────────────────
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    visibleHeight = 2 * 6 * Math.tan((camera.fov * Math.PI) / 360);
    worldPerPixel = visibleHeight / window.innerHeight;
    updateGearTransform();
    updateParticleBounds();
  }
  window.addEventListener('resize', onResize);
  updateGearTransform();

  // ─────────────────────────────────────────────────────────────
  // 10. Beacon System
  // ─────────────────────────────────────────────────────────────
  let activeInScopeBeacon = null;
  const currentLookAt = new THREE.Vector3(0, 0, -10);
  const targetLookAt = new THREE.Vector3(0, 0, -10);
  let beaconDefs = [];

  function bindNodeEvents(node) {
    const card = node.querySelector('.beacon-card');
    if (!card || card._bound) return;
    card._bound = true;
    card.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'A') return;
      card.classList.toggle('is-expanded');
      node.classList.toggle('is-focused');
    });
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `perspective(1000px) rotateX(${((-y / (rect.height / 2)) * 8).toFixed(2)}deg) rotateY(${((x / (rect.width / 2)) * 8).toFixed(2)}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  function refreshBeaconDefs() {
    beaconDefs = [];
    document.querySelectorAll('.beacon-node').forEach(node => {
      const pIdx = parseInt(node.getAttribute('data-pidx'), 10) || 0;
      beaconDefs.push({ id: node.id, el: node, cardEl: node.querySelector('.beacon-card'), pIdx });
      bindNodeEvents(node);
    });
  }

  document.querySelectorAll('.beacon-node').forEach((node, idx) => {
    const pIdx = parseInt(node.getAttribute('data-pidx'), 10);
    if (!isNaN(pIdx)) configureBeaconParticle(pIdx, idx);
  });
  refreshBeaconDefs();

  // ─────────────────────────────────────────────────────────────
  // 11. Helpers
  // ─────────────────────────────────────────────────────────────
  const currentCamPos = new THREE.Vector3(0, 0, 6);
  const targetCamPos = new THREE.Vector3(0, 0, 6);
  let tunnelRollAngle = 0;
  let lastTimestamp = 0;
  let currentRollSpeed = 0.06;

  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // 13. Animation Loop
  // ─────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const posAttr = particleGeometry.attributes.position;
    const posArr = posAttr.array;
    const colAttr = particleGeometry.attributes.color;
    const colArr = colAttr.array;

    // ── Scroll interpolation ──────────────────────────────────
    smoothScrollProg += (targetScrollProg - smoothScrollProg) * 0.14;

    // ── Tunnel phases ─────────────────────────────────────────
    const tZoom     = smoothstep(0.0,  0.38, smoothScrollProg);
    const tAssemble = smoothstep(0.22, 0.55, smoothScrollProg);
    const tunnelDensityProg = smoothstep(0.15, 0.48, smoothScrollProg);
    const tTravel   = smoothstep(0.38, 1.0,  smoothScrollProg);

    // ── Tunnel exit & Nav gear trigger ────────────────────────
    const tunnelExitProg = smoothstep(0.92, 1.0, smoothScrollProg);

    if (smoothScrollProg >= 0.98 && !menuVisible) {
      menuVisible = true;
      targetScrollProg = 1.0;
      if (mainContent) mainContent.classList.add('visible');
    }

    // ── Active particle count ─────────────────────────────────
    const menuDisperseProg = smoothstep(0.88, 1.0, smoothScrollProg);
    const inMenu = (menuVisible || smoothScrollProg >= 0.98);

    if (inMenu || menuDisperseProg > 0) {
      if (!inMenuColorsSet) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          colArr[i3]     = targetColors[i3];
          colArr[i3 + 1] = targetColors[i3 + 1];
          colArr[i3 + 2] = targetColors[i3 + 2];
        }
        colAttr.needsUpdate = true;
        inMenuColorsSet = true;
      }
    } else {
      inMenuColorsSet = false;
    }

    let activeCount;
    if (inMenu || menuDisperseProg > 0) {
      // Keep ALL particles active and dispersed in the main menu!
      activeCount = PARTICLE_COUNT;
    } else {
      activeCount = Math.floor(REST_PARTICLE_COUNT + (PARTICLE_COUNT - REST_PARTICLE_COUNT) * tunnelDensityProg);
    }
    particleGeometry.setDrawRange(0, activeCount);

    // ── Fade in tunnel particle colors ────────────────────────
    if (smoothScrollProg < 0.65 && tunnelExitProg < 0.1) {
      for (let i = REST_PARTICLE_COUNT; i < activeCount; i++) {
        const i3 = i * 3;
        colArr[i3]     = THREE.MathUtils.lerp(bgColor.r, targetColors[i3],     tunnelDensityProg);
        colArr[i3 + 1] = THREE.MathUtils.lerp(bgColor.g, targetColors[i3 + 1], tunnelDensityProg);
        colArr[i3 + 2] = THREE.MathUtils.lerp(bgColor.b, targetColors[i3 + 2], tunnelDensityProg);
      }
      colAttr.needsUpdate = true;
    }

    // ── Intro gear rotation (continuous on home, plus scroll-driven) ───────────
    gearMesh.rotation.z -= 0.005;
    gearGroup.rotation.z = -smoothScrollProg * (Math.PI * 4.2);

    // ── Camera position ───────────────────────────────────────
    let camTargetZ;
    if (menuVisible) {
      // Lock camera after tunnel exit, slightly pulled back for 3D context
      const TUNNEL_TRAVEL_DIST = 52.0;
      camTargetZ = (6.0 * (1 - 1) - 0.15 * 1) - TUNNEL_TRAVEL_DIST + 2.0;
    } else {
      const TUNNEL_TRAVEL_DIST = 52.0;
      camTargetZ = (6.0 * (1 - tZoom) - 0.15 * tZoom) - (TUNNEL_TRAVEL_DIST * tTravel);
    }
    const camTargetX = gearHoleWorldX * tZoom * (1 - tunnelExitProg);
    const camTargetY = gearHoleWorldY * tZoom * (1 - tunnelExitProg);
    targetCamPos.set(camTargetX, camTargetY, camTargetZ);

    // ── Look-at ───────────────────────────────────────────────
    const defaultLookX = gearHoleWorldX * tZoom * (1 - tunnelExitProg);
    const defaultLookY = gearHoleWorldY * tZoom * (1 - tunnelExitProg);
    const defaultLookZ = camTargetZ - 10.0;

    // Beacon scoping
    let inScopeBeacon = null, maxWeight = 0;

    if (smoothScrollProg >= 0.44 && !menuVisible) {
      for (let b = 0; b < beaconDefs.length; b++) {
        const beacon = beaconDefs[b];
        const card = beacon.cardEl || (beacon.el ? beacon.el.querySelector('.beacon-card') : null);
        const p3 = beacon.pIdx * 3;
        const pZ = posArr[p3 + 2];
        const distZ = camTargetZ - pZ;
        const inScope = (distZ >= 0.8 && distZ <= 6.8);

        if (inScope) {
          const normDist = (distZ - 0.8) / (6.8 - 0.8);
          const weight = Math.sin(normDist * Math.PI);
          if (weight > maxWeight) { maxWeight = weight; inScopeBeacon = beacon; }
          if (card && !card.classList.contains('is-expanded')) {
            card.classList.add('is-expanded');
            if (beacon.el) beacon.el.classList.add('is-focused');
          }
        } else {
          if (card && card.classList.contains('is-expanded')) {
            card.classList.remove('is-expanded');
            if (beacon.el) beacon.el.classList.remove('is-focused');
          }
        }
      }
    } else if (menuVisible) {
      // Hide all beacon cards after tunnel exit
      for (let b = 0; b < beaconDefs.length; b++) {
        const card = beaconDefs[b].cardEl;
        if (card && card.classList.contains('is-expanded')) {
          card.classList.remove('is-expanded');
          if (beaconDefs[b].el) beaconDefs[b].el.classList.remove('is-focused');
        }
      }
    } else {
      for (let b = 0; b < beaconDefs.length; b++) {
        const card = beaconDefs[b].cardEl || (beaconDefs[b].el ? beaconDefs[b].el.querySelector('.beacon-card') : null);
        if (card && card.classList.contains('is-expanded')) {
          card.classList.remove('is-expanded');
          if (beaconDefs[b].el) beaconDefs[b].el.classList.remove('is-focused');
        }
      }
    }

    activeInScopeBeacon = inScopeBeacon;

    if (inScopeBeacon && maxWeight > 0.05) {
      const bp3 = inScopeBeacon.pIdx * 3;
      const bpX = posArr[bp3], bpY = posArr[bp3 + 1];
      let side = 'face-right';
      if (inScopeBeacon.el.classList.contains('face-left')) side = 'face-left';
      else if (inScopeBeacon.el.classList.contains('face-down')) side = 'face-down';
      else if (inScopeBeacon.el.classList.contains('face-up')) side = 'face-up';

      let cardOffX = 0, cardOffY = 0;
      if (side === 'face-right') cardOffX = 0.22;
      else if (side === 'face-left') cardOffX = -0.22;
      else if (side === 'face-down') cardOffY = -0.20;
      else if (side === 'face-up') cardOffY = 0.20;

      const panFactor = maxWeight * 0.45;
      targetLookAt.set(
        defaultLookX + (bpX + cardOffX - defaultLookX) * panFactor,
        defaultLookY + (bpY + cardOffY - defaultLookY) * panFactor,
        defaultLookZ
      );
    } else {
      targetLookAt.set(defaultLookX, defaultLookY, defaultLookZ);
    }

    currentCamPos.lerp(targetCamPos, 0.14);
    currentLookAt.lerp(targetLookAt, 0.08);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // ── Intro animations ──────────────────────────────────────
    const introProgress = Math.min(1.0, elapsedTime / 1.1);
    const introEase = 1.0 - Math.pow(1.0 - introProgress, 3);

    const portalExpansion = 1.0 + smoothstep(0.22, 0.38, smoothScrollProg) * 2.2;
    const gearScale = baseGearWorldRadius * portalExpansion * introEase;
    gearGroup.scale.set(gearScale, gearScale, gearScale);

    if (lockupText) {
      const textOpacity = Math.max(0, 1.0 - tZoom * 2.8);
      lockupText.style.opacity = textOpacity.toFixed(3);
    }

    // ── Intro Gear Visibility (No fade, 100% solid until camera enters tunnel) ──
    gearMaterial.transparent = false;
    gearMaterial.opacity = 1.0;
    gearMaterial.depthWrite = true;
    gearGroup.visible = (smoothScrollProg < 0.385);

    // ── Particle positions ────────────────────────────────────
    const delta = (lastTimestamp === 0) ? 0.016 : Math.min(0.05, elapsedTime - lastTimestamp);
    lastTimestamp = elapsedTime;

    const targetRollSpeed = (inScopeBeacon && maxWeight > 0.25) ? (0.016 + (1.0 - maxWeight) * 0.045) : 0.065;
    currentRollSpeed += (targetRollSpeed - currentRollSpeed) * 0.04;
    tunnelRollAngle += delta * currentRollSpeed;

    const mouseActive = mouse.isHovered && smoothScrollProg < 0.08;
    const mouseStrength = 0.035 * (1.0 - smoothstep(0.0, 0.08, smoothScrollProg));
    const interactionRadiusSq = 1.1 * 1.1;

    if (inMenu) {
      // Main menu ambient constellation: all particles floating in deep 3D space
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.07;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.07;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.05;
        posArr[i3]     = menuPositions[i3]     + ambientX;
        posArr[i3 + 1] = menuPositions[i3 + 1] + ambientY;
        posArr[i3 + 2] = menuPositions[i3 + 2] + ambientZ;
      }
    } else if (menuDisperseProg > 0) {
      // Smooth dispersal transition: particles burst from the tunnel cylinder into the menu constellation
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        const tunX = gearHoleWorldX + Math.cos(tunAngle) * r;
        const tunY = gearHoleWorldY + Math.sin(tunAngle) * r;
        const tunZ = -0.2 - tunnelBaseZ[i];

        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.07;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.07;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.05;

        const targetX = menuPositions[i3] + ambientX;
        const targetY = menuPositions[i3 + 1] + ambientY;
        const targetZ = menuPositions[i3 + 2] + ambientZ;

        posArr[i3]     = tunX * (1 - menuDisperseProg) + targetX * menuDisperseProg;
        posArr[i3 + 1] = tunY * (1 - menuDisperseProg) + targetY * menuDisperseProg;
        posArr[i3 + 2] = tunZ * (1 - menuDisperseProg) + targetZ * menuDisperseProg;
      }
    } else if (tAssemble >= 0.98) {
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        posArr[i3]     = gearHoleWorldX + Math.cos(tunAngle) * r;
        posArr[i3 + 1] = gearHoleWorldY + Math.sin(tunAngle) * r;
        posArr[i3 + 2] = -0.2 - tunnelBaseZ[i];
      }
    } else if (tAssemble <= 0.02) {
      for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03;

        if (mouseActive) {
          const curPx = basePositions[i3] + mouseDisplacements[i3];
          const curPy = basePositions[i3 + 1] + mouseDisplacements[i3 + 1];
          const dx = curPx - mouse.worldX, dy = curPy - mouse.worldY;
          const distSq = dx * dx + dy * dy;
          if (distSq < interactionRadiusSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const force = (1.0 - dist / 1.1) * mouseStrength;
            mouseDisplacements[i3]     += (dx / dist) * force;
            mouseDisplacements[i3 + 1] += (dy / dist) * force;
          }
        }
        mouseDisplacements[i3]     *= 0.90;
        mouseDisplacements[i3 + 1] *= 0.90;

        posArr[i3]     = basePositions[i3]     + ambientX + mouseDisplacements[i3];
        posArr[i3 + 1] = basePositions[i3 + 1] + ambientY + mouseDisplacements[i3 + 1];
        posArr[i3 + 2] = basePositions[i3 + 2] + ambientZ;
      }
    } else {
      // Tunnel assembly blend
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const ambientX = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04 : 0;
        const ambientY = (i < REST_PARTICLE_COUNT) ? Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04 : 0;
        const ambientZ = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03 : 0;

        const restX = basePositions[i3]     + ambientX;
        const restY = basePositions[i3 + 1] + ambientY;
        const restZ = basePositions[i3 + 2] + ambientZ;

        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        const tunX = gearHoleWorldX + Math.cos(tunAngle) * r;
        const tunY = gearHoleWorldY + Math.sin(tunAngle) * r;
        const tunZ = -0.2 - tunnelBaseZ[i];

        posArr[i3]     = restX * (1 - tAssemble) + tunX * tAssemble;
        posArr[i3 + 1] = restY * (1 - tAssemble) + tunY * tAssemble;
        posArr[i3 + 2] = restZ * (1 - tAssemble) + tunZ * tAssemble;
      }
    }

    posAttr.needsUpdate = true;

    // ── Constellation chains ───────────────────────────────────
    let lineIdx = 0, sparkIdx = 0;
    const lPos = lineGeometry.attributes.position.array;
    const lCol = lineGeometry.attributes.color.array;
    const sPos = sparkGeometry.attributes.position.array;
    const sCol = sparkGeometry.attributes.color.array;

    const linkFade = inMenu ? 0.70 : (1.0 - tAssemble) * (1.0 - smoothstep(0.10, 0.28, smoothScrollProg));

    if (linkFade > 0.02) {
      if (elapsedTime >= activeChain.nextPickTime) {
        const startP = Math.floor(Math.random() * REST_PARTICLE_COUNT);
        triggerChain(startP, 3 + Math.floor(Math.random() * 2), false);
      }

      if (activeChain.nodes.length >= 2) {
        const numSegments = activeChain.nodes.length - 1;
        for (let s = 0; s < numSegments; s++) {
          const segAge = elapsedTime - (activeChain.startTime + s * activeChain.segmentDelay);
          if (segAge >= 0 && segAge < activeChain.segmentDuration) {
            const normAge = segAge / activeChain.segmentDuration;
            const pulse = Math.sin(normAge * Math.PI);
            const lineAlpha = pulse * linkFade;

            const n1 = activeChain.nodes[s] * 3;
            const n2 = activeChain.nodes[s + 1] * 3;

            if (lineIdx < MAX_CHAIN_SEGMENTS) {
              const baseIdx = lineIdx * 6;
              lPos[baseIdx] = posArr[n1]; lPos[baseIdx+1] = posArr[n1+1]; lPos[baseIdx+2] = posArr[n1+2];
              lPos[baseIdx+3] = posArr[n2]; lPos[baseIdx+4] = posArr[n2+1]; lPos[baseIdx+5] = posArr[n2+2];
              const rC = 0.12*lineAlpha, gC = 0.52*lineAlpha, bC = 0.92*lineAlpha;
              lCol[baseIdx] = rC; lCol[baseIdx+1] = gC; lCol[baseIdx+2] = bC;
              lCol[baseIdx+3] = rC; lCol[baseIdx+4] = gC; lCol[baseIdx+5] = bC;
              lineIdx++;
            }

            if (sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase] = posArr[n2]; sPos[spBase+1] = posArr[n2+1]; sPos[spBase+2] = posArr[n2+2];
              sCol[spBase] = 0.15*lineAlpha; sCol[spBase+1] = 0.75*lineAlpha; sCol[spBase+2] = 1.0*lineAlpha;
              sparkIdx++;
            }

            if (s === 0 && sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase] = posArr[n1]; sPos[spBase+1] = posArr[n1+1]; sPos[spBase+2] = posArr[n1+2];
              sCol[spBase] = 0.15*lineAlpha; sCol[spBase+1] = 0.75*lineAlpha; sCol[spBase+2] = 1.0*lineAlpha;
              sparkIdx++;
            }
          }
        }
      }
    }

    lineGeometry.setDrawRange(0, lineIdx * 2);
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;
    sparkGeometry.setDrawRange(0, sparkIdx);
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkGeometry.attributes.color.needsUpdate = true;

    // ── Beacon card projections ────────────────────────────────
    const beaconOverlayEl = document.getElementById('beacon-overlay');
    if (beaconOverlayEl) {
      beaconOverlayEl.style.display = inMenu ? 'none' : 'block';
    }
    const beaconProjVec = new THREE.Vector3();
    for (let b = 0; b < beaconDefs.length; b++) {
      const beacon = beaconDefs[b];
      if (!beacon.el) continue;

      if (menuVisible) {
        beacon.el.style.opacity = '0';
        beacon.el.style.visibility = 'hidden';
        beacon.el.style.pointerEvents = 'none';
        continue;
      }

      const p3 = beacon.pIdx * 3;
      beaconProjVec.set(posArr[p3], posArr[p3+1], posArr[p3+2]);
      beaconProjVec.project(camera);

      const distZ = camera.position.z - posArr[p3+2];
      const isThisFocused = (activeInScopeBeacon && activeInScopeBeacon.pIdx === beacon.pIdx);

      if (smoothScrollProg < 0.40 || distZ < 0.35 || distZ > 24.0 || beaconProjVec.z > 1.0) {
        beacon.el.style.opacity = '0';
        beacon.el.style.visibility = 'hidden';
        beacon.el.style.pointerEvents = 'none';
      } else {
        const farFade = smoothstep(24.0, 12.0, distZ);
        const nearFade = smoothstep(0.35, 1.4, distZ);
        const tunnelFade = smoothstep(0.40, 0.52, smoothScrollProg);
        let alpha = farFade * nearFade * tunnelFade;
        if (isThisFocused) alpha = 1.0;
        else if (activeInScopeBeacon) alpha *= 0.35;

        const scale = THREE.MathUtils.clamp(4.6 / (distZ + 1.6), 0.70, 1.15);
        const sx = (beaconProjVec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-beaconProjVec.y * 0.5 + 0.5) * window.innerHeight;
        const padX = Math.min(220, window.innerWidth * 0.22);
        const padY = Math.min(180, window.innerHeight * 0.22);
        const safeSx = THREE.MathUtils.clamp(sx, padX, window.innerWidth - padX);
        const safeSy = THREE.MathUtils.clamp(sy, padY, window.innerHeight - padY);

        beacon.el.style.transform = `translate3d(${safeSx.toFixed(1)}px, ${safeSy.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        beacon.el.style.opacity = alpha.toFixed(3);
        beacon.el.style.visibility = alpha > 0.02 ? 'visible' : 'hidden';
        beacon.el.style.pointerEvents = alpha > 0.30 ? 'auto' : 'none';
      }
    }

    renderer.render(scene, camera);
  }

  animate();
})();
