cmd_Release/opencv.node := c++ -bundle -undefined dynamic_lookup -Wl,-search_paths_first -mmacosx-version-min=10.5 -arch x86_64 -L./Release  -o Release/opencv.node Release/obj.target/opencv/src/init.o Release/obj.target/opencv/src/Matrix.o Release/obj.target/opencv/src/OpenCV.o Release/obj.target/opencv/src/CascadeClassifierWrap.o Release/obj.target/opencv/src/Contours.o Release/obj.target/opencv/src/Point.o Release/obj.target/opencv/src/VideoCaptureWrap.o Release/obj.target/opencv/src/CamShift.o Release/obj.target/opencv/src/HighGUI.o Release/obj.target/opencv/src/FaceRecognizer.o Release/obj.target/opencv/src/Features2d.o Release/obj.target/opencv/src/BackgroundSubtractor.o Release/obj.target/opencv/src/Constants.o Release/obj.target/opencv/src/Calib3D.o Release/obj.target/opencv/src/ImgProc.o Release/obj.target/opencv/src/Stereo.o Release/obj.target/opencv/src/LDAWrap.o -L/usr/local/Cellar/opencv/2.4.12_2/lib -lopencv_calib3d -lopencv_contrib -lopencv_core -lopencv_features2d -lopencv_flann -lopencv_gpu -lopencv_highgui -lopencv_imgproc -lopencv_legacy -lopencv_ml -lopencv_nonfree -lopencv_objdetect -lopencv_ocl -lopencv_photo -lopencv_stitching -lopencv_superres -lopencv_ts -lopencv_video -lopencv_videostab
