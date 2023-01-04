# Copyright 2023 Comcast Cable Communications Management, LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

function(InstallHeaders)
    set(optionsArgs)
    set(oneValueArgs TARGET NAMESPACE DESTINATION)
    set(multiValueArgs HEADERS)

    cmake_parse_arguments(Argument "${optionsArgs}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )
    if (Argument_UNPARSED_ARGUMENTS)
	    message(FATAL_ERROR "Unknown keywords given to InstallHeaders(): \"${Argument_UNPARSED_ARGUMENTS}\"")
    endif()
    if (Argument_HEADERS)
        add_custom_command(
            TARGET ${Argument_TARGET}
            POST_BUILD
	    COMMENT "=================== Installing Headers ======================"
	)
        foreach(directory ${Argument_HEADERS})
            add_custom_command(
                TARGET ${Argument_TARGET}
                POST_BUILD
		COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${Argument_NAMESPACE}/usr/include/${Argument_DESTINATION}/${directory}
                COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/${directory}/*.h ${CMAKE_BINARY_DIR}/${Argument_NAMESPACE}/usr/include/${Argument_DESTINATION}/${directory}
        )
        endforeach(directory)
    endif()
endfunction(InstallHeaders)

function(InstallLibraries)
    set(optionsArgs SHARED)
    set(oneValueArgs TARGET DESTINATION)
    set(multiValueArgs LIBRARIES)

    cmake_parse_arguments(Argument "${optionsArgs}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )
    if (Argument_UNPARSED_ARGUMENTS)
	    message(FATAL_ERROR "Unknown keywords given to InstallLibraries(): \"${Argument_UNPARSED_ARGUMENTS}\"")
    endif()
    if (Argument_LIBRARIES)
        add_custom_command(
            TARGET ${Argument_TARGET}
            POST_BUILD
	    COMMENT "=================== Installing Libraries ======================"
	)
        foreach(LIBRARY ${Argument_LIBRARIES})
            if (Argument_SHARED)
                add_custom_command(
                    TARGET ${Argument_TARGET}
                    POST_BUILD
	            COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib
                    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/Release/lib${LIBRARY}.so.${PROJECT_VERSION} ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib
                    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${LIBRARY}.so.${PROJECT_VERSION_MAJOR}" -D "DESTINATION=${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib" -P ${CMAKE_SOURCE_DIR}/cmake/CopySymlink.cmake
		    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${LIBRARY}.so" -D "DESTINATION=${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib" -P ${CMAKE_SOURCE_DIR}/cmake/CopySymlink.cmake
                )
             else()
                add_custom_command(
                    TARGET ${Argument_TARGET}
                    POST_BUILD
	            COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib
		    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/lib${LIBRARY}.a ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib
                )

             endif()
        endforeach(LIBRARY)
    endif()
endfunction(InstallLibraries)

function(InstallCMakeConfigs)
    set(optionsArgs)
    set(oneValueArgs TARGET DESTINATION)
    set(multiValueArgs)

    cmake_parse_arguments(Argument "${optionsArgs}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )
    if (Argument_UNPARSED_ARGUMENTS)
	    message(FATAL_ERROR "Unknown keywords given to InstallCMakeConfigs(): \"${Argument_UNPARSED_ARGUMENTS}\"")
    endif()
    if (Argument_TARGET)
 
        add_custom_command(
            TARGET ${Argument_TARGET}
            POST_BUILD
            COMMENT "=================== Installing CMakeConfigs ======================"
            COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib/cmake/${Argument_TARGET}
            COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${Argument_TARGET}Config*.cmake ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib/cmake/${Argument_TARGET}
            COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/Export/lib/cmake/${Argument_TARGET}/${Argument_TARGET}Targets*.cmake ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib/cmake/${Argument_TARGET}
	)
        if (EXISTS ${CMAKE_CURRENT_BINARY_DIR}/${Argument_TARGET}.pc)
            add_custom_command(
                TARGET ${Argument_TARGET}
                POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib/pkgconfig
                COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${Argument_TARGET}.pc ${CMAKE_BINARY_DIR}/${Argument_DESTINATION}/usr/lib/pkgconfig
            )
        endif()
    endif()
endfunction(InstallCMakeConfigs)
