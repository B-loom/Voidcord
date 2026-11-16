cmake_minimum_required(VERSION 3.22)
project(voidcordnode CXX)

# `NODE_MOBILE_DIR` est passé par `app/build.gradle.kts` : le dossier déposé par
# `node scripts/fetchNodeMobile.mjs`.
if(NOT DEFINED NODE_MOBILE_DIR)
    message(FATAL_ERROR "NODE_MOBILE_DIR n'est pas défini.")
endif()

set(NODE_INCLUDE "${NODE_MOBILE_DIR}/include/node")
set(NODE_LIBRARY "${NODE_MOBILE_DIR}/bin/${ANDROID_ABI}/libnode.so")

if(NOT EXISTS "${NODE_LIBRARY}")
    message(FATAL_ERROR "libnode.so manque pour ${ANDROID_ABI} : ${NODE_LIBRARY}")
endif()

# La bibliothèque de nodejs-mobile est prise telle quelle : elle est déjà compilée, et
# Gradle l'empaquette depuis `nodejs-mobile/bin/<abi>/`.
add_library(node SHARED IMPORTED)
set_target_properties(node PROPERTIES IMPORTED_LOCATION "${NODE_LIBRARY}")

add_library(voidcordnode SHARED voidcord_node.cpp)

target_include_directories(voidcordnode PRIVATE "${NODE_INCLUDE}")
target_link_libraries(voidcordnode node log android)
