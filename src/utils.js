import { INCORRECT_INPUT_PATH } from './constants';
import PRESET from './enums/Preset';
import QUALITY from './enums/Quality';

/**
 * Extract extension from file url
 * @param path
 * @returns {string}
 */
const getExtension = (path: String) => {
    const array = path.split('.');
    return array[array.length - 1] ? array[array.length - 1] : INCORRECT_INPUT_PATH;
};

/**
 * Perform operation based on options and return correspondent ffmpeg setting
 * @param quality
 * @returns {{"-crf": string}}
 */
const getCompressionOptionsResolution = (quality) => {
    let _quality;

    const result = {
        "-crf": "",
    };

    switch (quality) {
        case QUALITY.HIGH:
            _quality = 14;
            break;
        case QUALITY.MEDIUM:
            _quality = 18;
            break;
        case QUALITY.LOW:
            _quality = 22;
            break;
        default: _quality = 14;
    }

    result["-crf"] = _quality.toString();

    return result;
};

/**
 * Check compression options
 *
 * @param options
 * @returns {*[]}
 */
const isOptionsValueCorrect = (options) => {
    if (options) {
        if (options.quality &&
            ![QUALITY.getStaticValueList()].includes(options.quality)) {
            return [false, "Incorrect quality options. Please provide one of [" +
            QUALITY.getStaticValueList().map(item => `'${item}'`).join(', ') + "]"];
        }
        if (options.speed &&
            ![PRESET.getStaticValueList()].includes(options.speed)) {
            return [false, "Incorrect speed options. Please provide one of [" +
            PRESET.getStaticValueList().map(item => `'${item}'`).join(', ') + "]"];
        }
    }

    return [true, ""];
};

export {
    getExtension,
    isOptionsValueCorrect,
    getCompressionOptionsResolution
}