import PRESET from '../enums/Preset';
import QUALITY from '../enums/Quality';
import { generateFile } from '../CacheManager';
import {RNFFprobe, RNFFmpeg, RNFFmpegConfig} from 'react-native-ffmpeg';
import {
    getExtension,
    isOptionsValueCorrect,
    getCompressionOptionsResolution,
} from '../utils';
import {
    INCORRECT_INPUT_PATH,
    INCORRECT_OUTPUT_PATH,
    ERROR_OCCUR_WHILE_GENERATING_OUTPUT_FILE
} from '../constants';

const DEFAULT_COMPRESS_OPTIONS = {
    quality: QUALITY.MEDIUM,
    speed: PRESET.VERY_SLOW,
};

class VideoTools {
    constructor(videoPath) {
        this.fullPath = videoPath;
        this.extension = getExtension(videoPath);
        this.mediaDetails = null;

        // this.getOrUpdateCurrentMediaDetails();
    }

    /**
     * Update a video path
     * @param videoPath
     */
    setVideoPath = (videoPath) => {
        if (videoPath !== this.fullPath) {
            this.mediaDetails = null;
            this.fullPath = videoPath;
            this.extension = getExtension(videoPath);
        }

        // this.getOrUpdateCurrentMediaDetails();
    };

    /**
     * Return boolean to indicate whether input file is correct or not
     * @returns {boolean}
     */
    hasCorrectInputFile = () => this.extension !== INCORRECT_INPUT_PATH;

    /**
     * Display error in case input file is incorrect
     * @returns {{message: string, isCorrect: boolean}}
     */
    isInputFileCorrect = () => {
          if (this.extension === INCORRECT_INPUT_PATH) {
              return {
                  isCorrect: false,
                  message: INCORRECT_INPUT_PATH
              };
          }
          return {
            isCorrect: true,
            message: ''
        };
    };

    /**
     * Compress video according to parameters
     * @param options
     * @returns {Promise<any>}
     */
    compress = (options = DEFAULT_COMPRESS_OPTIONS) => {
        return new Promise(async (resolve, reject) => {
            // Check if the video path is correct
            const _isInputFileCorrect = this.isInputFileCorrect();
            if (!_isInputFileCorrect.isCorrect) {
                reject(_isInputFileCorrect.message);
                return;
            }

            // Check if options parameters are correct
            const _isOptionsValueCorrect = isOptionsValueCorrect(options);
            if (!_isOptionsValueCorrect.isCorrect) {
                reject(_isOptionsValueCorrect.message);
                return;
            }

            // Check if output file is correct
            let outputFilePath = undefined;
            try {
                // use default output file
                // or use new file from cache folder
                // TODO: Only generate output file if android
                outputFilePath = options.outputFilePath ? options.outputFilePath : await generateFile(this.extension);
                if (outputFilePath === undefined || outputFilePath === null) {
                    reject(options.outputFilePath ? INCORRECT_OUTPUT_PATH : ERROR_OCCUR_WHILE_GENERATING_OUTPUT_FILE);
                    return;
                }
            } catch (e) {
                reject(options.outputFilePath ? INCORRECT_OUTPUT_PATH : ERROR_OCCUR_WHILE_GENERATING_OUTPUT_FILE);
                return;
            }

            // get command options based of options parameters
            const result = getCompressionOptionsResolution(options.quality);

            // group command from calculated values
            const commandObject = {
                "-i": this.fullPath,
                "-c:v": "libx264",
                "-crf": result["-crf"],
                "-preset": options.speed ? options.speed : DEFAULT_COMPRESS_OPTIONS.speed,
            };
            if (options.bitrate) commandObject['bitrate'] = options.bitrate;

            // construct final command
            const cmd = [];
            Object.entries(commandObject).map(item => {
                cmd.push(item[0]);
                cmd.push(item[1]);
            });

            // add output file as last parameters
            cmd.push(outputFilePath);

            // execute command
            VideoTools
                .execute(cmd.join(' '))
                .then(result => resolve({rc: result, outputFilePath: outputFilePath}))
                .catch(error => reject(error));
        });
    };

    /**
     * Retrieve details about a media
     * @returns {Promise<MediaDetails>}
     */
    getDetails = (force = false) => {
        return new Promise(async (resolve, reject) => {
            // Check force parameter
            if (typeof force !== 'boolean') {
                reject(`Parameter force should be boolean. ${typeof force} given`);
                return;
            }

            // Perform cache operation
            if (!force && this.mediaDetails) {
                resolve(this.mediaDetails);
                return;
            }

            const GetAnotherMediaInfoCommand = `-i "${this.fullPath}" -v error -select_streams v:0 -show_entries format=size -show_entries stream=size,width,height -of json`;
            try {
                // Since we used "-v error", a work around is to call first this command before the following
                await RNFFprobe.execute(GetAnotherMediaInfoCommand);

                // get the output result of the command
                // example of output {"programs": [], "streams": [{"width": 640,"height": 360}], "format": {"size": "15804433"}}
                let mediaInfo = await RNFFmpegConfig.getLastCommandOutput();
                mediaInfo = JSON.parse(mediaInfo.lastCommandOutput);

                // execute second command
                const mediaInformation = await RNFFprobe.getMediaInformation(this.fullPath);

                // treat both results
                mediaInformation['size'] = Number(mediaInfo.format.size);
                mediaInformation['width'] = Number(mediaInfo.streams[0].width);
                mediaInformation['height'] = Number(mediaInfo.streams[0].height);
                mediaInformation['extension'] = getExtension(this.fullPath);

                // update mediaDetails
                this.mediaDetails = mediaInformation;

                // return result
                resolve(mediaInformation);
            } catch (e) {
                reject(e);
            }
        });
    };

    /**
     * Initialize mediaDetails or update it
     */
    getOrUpdateCurrentMediaDetails = () => {
        if (this.hasCorrectInputFile()) {
            // reset media details so that it cannot get into saved one
            this.mediaDetails = null;

            this.getDetails()
                .then({})
                .catch(() => {});
        }
    };

    /**
     * Run a command
     * @param command
     * @returns {Promise<{rc: number}>}
     */
    static execute = command => RNFFmpeg.execute(command);

    /**
     * Cancel ongoing command
     */
    static cancel = () => RNFFmpeg.cancel();
}

export default VideoTools;
