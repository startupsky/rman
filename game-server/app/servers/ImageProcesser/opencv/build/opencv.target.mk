# This file is generated by gyp; do not edit.

TOOLSET := target
TARGET := opencv
DEFS_Debug := \
	'-DNODE_GYP_MODULE_NAME=opencv' \
	'-D_DARWIN_USE_64_BIT_INODE=1' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DBUILDING_NODE_EXTENSION' \
	'-DDEBUG' \
	'-D_DEBUG'

# Flags passed to all source files.
CFLAGS_Debug := \
	-O0 \
	-gdwarf-2 \
	-mmacosx-version-min=10.5 \
	-arch x86_64 \
	-Wall \
	-Wendif-labels \
	-W \
	-Wno-unused-parameter

# Flags passed to only C files.
CFLAGS_C_Debug := \
	-fno-strict-aliasing \
	-mmacosx-version-min=10.7 \
	-std=c++11 \
	-stdlib=libc++ \
	-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I/usr/local/Cellar/opencv/2.4.12_2/include

# Flags passed to only C++ files.
CFLAGS_CC_Debug := \
	-std=gnu++0x \
	-fno-threadsafe-statics \
	-fno-strict-aliasing \
	-mmacosx-version-min=10.7 \
	-std=c++11 \
	-stdlib=libc++ \
	-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I/usr/local/Cellar/opencv/2.4.12_2/include

# Flags passed to only ObjC files.
CFLAGS_OBJC_Debug :=

# Flags passed to only ObjC++ files.
CFLAGS_OBJCC_Debug :=

INCS_Debug := \
	-I/Users/sirius/.node-gyp/4.3.2/include/node \
	-I/Users/sirius/.node-gyp/4.3.2/src \
	-I/Users/sirius/.node-gyp/4.3.2/deps/uv/include \
	-I/Users/sirius/.node-gyp/4.3.2/deps/v8/include \
	-I$(srcdir)/-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I$(srcdir)/-I/usr/local/Cellar/opencv/2.4.12_2/include \
	-I$(srcdir)/node_modules/nan

DEFS_Release := \
	'-DNODE_GYP_MODULE_NAME=opencv' \
	'-D_DARWIN_USE_64_BIT_INODE=1' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DBUILDING_NODE_EXTENSION'

# Flags passed to all source files.
CFLAGS_Release := \
	-Os \
	-gdwarf-2 \
	-mmacosx-version-min=10.5 \
	-arch x86_64 \
	-Wall \
	-Wendif-labels \
	-W \
	-Wno-unused-parameter

# Flags passed to only C files.
CFLAGS_C_Release := \
	-fno-strict-aliasing \
	-mmacosx-version-min=10.7 \
	-std=c++11 \
	-stdlib=libc++ \
	-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I/usr/local/Cellar/opencv/2.4.12_2/include

# Flags passed to only C++ files.
CFLAGS_CC_Release := \
	-std=gnu++0x \
	-fno-threadsafe-statics \
	-fno-strict-aliasing \
	-mmacosx-version-min=10.7 \
	-std=c++11 \
	-stdlib=libc++ \
	-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I/usr/local/Cellar/opencv/2.4.12_2/include

# Flags passed to only ObjC files.
CFLAGS_OBJC_Release :=

# Flags passed to only ObjC++ files.
CFLAGS_OBJCC_Release :=

INCS_Release := \
	-I/Users/sirius/.node-gyp/4.3.2/include/node \
	-I/Users/sirius/.node-gyp/4.3.2/src \
	-I/Users/sirius/.node-gyp/4.3.2/deps/uv/include \
	-I/Users/sirius/.node-gyp/4.3.2/deps/v8/include \
	-I$(srcdir)/-I/usr/local/Cellar/opencv/2.4.12_2/include/opencv \
	-I$(srcdir)/-I/usr/local/Cellar/opencv/2.4.12_2/include \
	-I$(srcdir)/node_modules/nan

OBJS := \
	$(obj).target/$(TARGET)/src/init.o \
	$(obj).target/$(TARGET)/src/Matrix.o \
	$(obj).target/$(TARGET)/src/OpenCV.o \
	$(obj).target/$(TARGET)/src/CascadeClassifierWrap.o \
	$(obj).target/$(TARGET)/src/Contours.o \
	$(obj).target/$(TARGET)/src/Point.o \
	$(obj).target/$(TARGET)/src/VideoCaptureWrap.o \
	$(obj).target/$(TARGET)/src/CamShift.o \
	$(obj).target/$(TARGET)/src/HighGUI.o \
	$(obj).target/$(TARGET)/src/FaceRecognizer.o \
	$(obj).target/$(TARGET)/src/Features2d.o \
	$(obj).target/$(TARGET)/src/BackgroundSubtractor.o \
	$(obj).target/$(TARGET)/src/Constants.o \
	$(obj).target/$(TARGET)/src/Calib3D.o \
	$(obj).target/$(TARGET)/src/ImgProc.o \
	$(obj).target/$(TARGET)/src/Stereo.o \
	$(obj).target/$(TARGET)/src/LDAWrap.o

# Add to the list of files we specially track dependencies for.
all_deps += $(OBJS)

# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual.
$(OBJS): TOOLSET := $(TOOLSET)
$(OBJS): GYP_CFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE))
$(OBJS): GYP_CXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE))
$(OBJS): GYP_OBJCFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE)) $(CFLAGS_OBJC_$(BUILDTYPE))
$(OBJS): GYP_OBJCXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE)) $(CFLAGS_OBJCC_$(BUILDTYPE))

# Suffix rules, putting all outputs into $(obj).

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# End of this set of suffix rules
### Rules for final target.
LDFLAGS_Debug := \
	-undefined dynamic_lookup \
	-Wl,-search_paths_first \
	-mmacosx-version-min=10.5 \
	-arch x86_64 \
	-L$(builddir)

LIBTOOLFLAGS_Debug := \
	-undefined dynamic_lookup \
	-Wl,-search_paths_first

LDFLAGS_Release := \
	-undefined dynamic_lookup \
	-Wl,-search_paths_first \
	-mmacosx-version-min=10.5 \
	-arch x86_64 \
	-L$(builddir)

LIBTOOLFLAGS_Release := \
	-undefined dynamic_lookup \
	-Wl,-search_paths_first

LIBS := \
	-L/usr/local/Cellar/opencv/2.4.12_2/lib \
	-lopencv_calib3d \
	-lopencv_contrib \
	-lopencv_core \
	-lopencv_features2d \
	-lopencv_flann \
	-lopencv_gpu \
	-lopencv_highgui \
	-lopencv_imgproc \
	-lopencv_legacy \
	-lopencv_ml \
	-lopencv_nonfree \
	-lopencv_objdetect \
	-lopencv_ocl \
	-lopencv_photo \
	-lopencv_stitching \
	-lopencv_superres \
	-lopencv_ts \
	-lopencv_video \
	-lopencv_videostab

$(builddir)/opencv.node: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
$(builddir)/opencv.node: LIBS := $(LIBS)
$(builddir)/opencv.node: GYP_LIBTOOLFLAGS := $(LIBTOOLFLAGS_$(BUILDTYPE))
$(builddir)/opencv.node: TOOLSET := $(TOOLSET)
$(builddir)/opencv.node: $(OBJS) FORCE_DO_CMD
	$(call do_cmd,solink_module)

all_deps += $(builddir)/opencv.node
# Add target alias
.PHONY: opencv
opencv: $(builddir)/opencv.node

# Short alias for building this executable.
.PHONY: opencv.node
opencv.node: $(builddir)/opencv.node

# Add executable to "all" target.
.PHONY: all
all: $(builddir)/opencv.node

