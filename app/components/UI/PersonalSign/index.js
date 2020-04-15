import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../../locales/i18n';
import { util } from 'gaba';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: '70%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	informationCol: {
		flex: 7,
		paddingTop: 10
	},
	messageLabelText: {
		...fontStyles.bold,
		marginBottom: 5,
		fontSize: 16
	},
	messageText: {
		flex: 1,
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	}
});

/**
 * PureComponent that supports personal_sign
 */
export default class PersonalSign extends PureComponent {
	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * Personal message to be displayed to the user
		 */
		messageParams: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await PersonalMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signPersonalMessage(cleanMessageParams);
		PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		PersonalMessageManager.rejectMessage(messageId);
	};

	cancelSignature = () => {
		this.rejectMessage();
		this.props.onCancel();
	};

	confirmSignature = () => {
		this.signMessage();
		this.props.onConfirm();
	};

	render() {
		const { messageParams, currentPageInformation } = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						{strings('signature_request.title')}
					</Text>
				</View>
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					currentPageInformation={currentPageInformation}
					type="personalSign"
				>
					<View style={styles.informationCol}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						{util
							.hexToText(messageParams.data)
							.split('\n')
							.map((line, i) => (
								<Text key={`txt_${i}`} style={styles.messageText}>
									{line}
								</Text>
							))}
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
